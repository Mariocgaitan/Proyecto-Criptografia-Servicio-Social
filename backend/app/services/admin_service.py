"""
Servicio del módulo Admin — lógica de negocio para gestión de proyectos y credenciales empresa.
"""
import re
import secrets
import unicodedata

import bcrypt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.empresa import Empresa
from app.models.evento import Evento
from app.models.proyecto import Proyecto
from app.models.usuario import Usuario


# ── Helpers ───────────────────────────────────────────────────────────────────

def _slugify(text: str) -> str:
    """Convierte texto a slug seguro para correos: 'Optimización Logística' → 'optimizacion-logistica'."""
    nfkd = unicodedata.normalize("NFKD", text)
    ascii_text = nfkd.encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_text.lower()).strip("-")
    return slug[:30]  # máximo 30 chars para el correo


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _generar_credenciales_empresa(nombre_proyecto: str, nombre_empresa: str, id_proyecto: int) -> dict:
    """Genera correo y contraseña únicos para el usuario empresa del proyecto."""
    slug_proyecto = _slugify(nombre_proyecto)
    slug_empresa = _slugify(nombre_empresa)
    password = secrets.token_urlsafe(12)
    correo = f"{slug_proyecto}@{slug_empresa}.sid.mx"
    return {
        "id_matricula": f"PROJ_{id_proyecto:04d}",
        "correo": correo,
        "password": password,
        "password_hash": _hash_password(password),
    }


# ── Proyectos ─────────────────────────────────────────────────────────────────

async def listar_proyectos(db: AsyncSession) -> list[dict]:
    """Devuelve todos los proyectos con datos de empresa, evento y si tienen usuario empresa."""
    result = await db.execute(
        select(Proyecto, Empresa, Evento)
        .join(Empresa, Proyecto.id_empresa == Empresa.id_empresa)
        .join(Evento, Proyecto.id_evento == Evento.id_evento)
        .order_by(Evento.id_evento, Empresa.nombre_empresa)
    )
    rows = result.all()

    # Obtenemos qué proyectos ya tienen usuario empresa
    empresas_result = await db.execute(
        select(Usuario.id_proyecto).where(Usuario.rol == "empresa")
    )
    proyectos_con_usuario = {r for r in empresas_result.scalars().all() if r}

    return [
        {
            "id_proyecto": p.id_proyecto,
            "nombre_proyecto": p.nombre_proyecto,
            "descripcion": p.descripcion,
            "empresa": e.nombre_empresa,
            "id_empresa": p.id_empresa,
            "evento": ev.nombre,
            "id_evento": p.id_evento,
            "capacidad_max": p.capacidad_max,
            "cupo_actual": p.cupo_actual,
            "capacidad_espera_max": p.capacidad_espera_max,
            "cupos_disponibles": max(0, p.capacidad_max - p.cupo_actual),
            "tiene_credenciales": p.id_proyecto in proyectos_con_usuario,
            "estado": (
                "LLENO" if p.cupo_actual >= p.capacidad_max
                else "CASI LLENO" if p.cupo_actual >= p.capacidad_max * 0.8
                else "DISPONIBLE"
            ),
        }
        for p, e, ev in rows
    ]


async def listar_empresas(db: AsyncSession) -> list[dict]:
    """Devuelve todas las empresas."""
    result = await db.execute(select(Empresa).order_by(Empresa.nombre_empresa))
    return [
        {"id_empresa": e.id_empresa, "nombre_empresa": e.nombre_empresa}
        for e in result.scalars().all()
    ]


async def listar_eventos(db: AsyncSession) -> list[dict]:
    """Devuelve todos los eventos."""
    result = await db.execute(select(Evento).order_by(Evento.id_evento))
    return [
        {
            "id_evento": ev.id_evento,
            "nombre": ev.nombre,
            "periodo": ev.periodo,
            "anio": ev.anio,
            "activo": ev.activo,
        }
        for ev in result.scalars().all()
    ]


async def crear_proyecto(db: AsyncSession, datos) -> dict:
    """
    Crea un nuevo proyecto y genera automáticamente credenciales de acceso
    para el representante de la empresa.
    """
    from fastapi import HTTPException

    empresa = await db.get(Empresa, datos.id_empresa)
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    evento = await db.get(Evento, datos.id_evento)
    if not evento:
        raise HTTPException(status_code=404, detail="Evento no encontrado")

    # 1. Crear el proyecto
    proyecto = Proyecto(
        id_empresa=datos.id_empresa,
        id_evento=datos.id_evento,
        nombre_proyecto=datos.nombre_proyecto,
        descripcion=datos.descripcion,
        capacidad_max=datos.capacidad_max,
        cupo_actual=0,
        capacidad_espera_max=datos.capacidad_espera_max,
    )
    db.add(proyecto)
    await db.flush()  # Obtener el id_proyecto antes del commit

    # 2. Generar credenciales para el usuario empresa
    creds = _generar_credenciales_empresa(
        datos.nombre_proyecto, empresa.nombre_empresa, proyecto.id_proyecto
    )

    # Verificar que el correo no exista ya
    existing = await db.execute(select(Usuario).where(Usuario.correo == creds["correo"]))
    if existing.scalar_one_or_none():
        # Si el correo ya existe (nombre muy similar), agregar sufijo con id
        creds["correo"] = f"proj{proyecto.id_proyecto}@{_slugify(empresa.nombre_empresa)}.sid.mx"

    usuario_empresa = Usuario(
        id_matricula=creds["id_matricula"],
        nombre=datos.nombre_proyecto,
        correo=creds["correo"],
        carrera="Empresa",
        semestre=0,
        password_hash=creds["password_hash"],
        totp_secret="A" * 32,
        rol="empresa",
        id_proyecto=proyecto.id_proyecto,
    )
    db.add(usuario_empresa)
    await db.commit()
    await db.refresh(proyecto)

    return {
        "id_proyecto": proyecto.id_proyecto,
        "nombre_proyecto": proyecto.nombre_proyecto,
        "empresa": empresa.nombre_empresa,
        "evento": evento.nombre,
        "capacidad_max": proyecto.capacidad_max,
        "cupo_actual": 0,
        # Credenciales generadas — solo se muestran una vez
        "credenciales": {
            "correo": creds["correo"],
            "password": creds["password"],
            "url_login": "/empresa/login",
        },
    }


async def generar_credenciales_para_proyecto(db: AsyncSession, id_proyecto: int) -> dict:
    """
    Genera (o regenera) credenciales para un proyecto que aún no tiene usuario empresa.
    """
    from fastapi import HTTPException

    proyecto = await db.get(Proyecto, id_proyecto)
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    empresa = await db.get(Empresa, proyecto.id_empresa)

    # Verificar si ya tiene usuario
    result = await db.execute(
        select(Usuario).where(Usuario.id_proyecto == id_proyecto, Usuario.rol == "empresa")
    )
    usuario_existente = result.scalar_one_or_none()

    creds = _generar_credenciales_empresa(proyecto.nombre_proyecto, empresa.nombre_empresa, id_proyecto)

    if usuario_existente:
        # Regenerar contraseña
        new_password = secrets.token_urlsafe(12)
        usuario_existente.password_hash = _hash_password(new_password)
        await db.commit()
        return {
            "correo": usuario_existente.correo,
            "password": new_password,
            "url_login": "/empresa/login",
            "regenerada": True,
        }
    else:
        # Crear nuevo usuario empresa
        usuario_empresa = Usuario(
            id_matricula=creds["id_matricula"],
            nombre=proyecto.nombre_proyecto,
            correo=creds["correo"],
            carrera="Empresa",
            semestre=0,
            password_hash=creds["password_hash"],
            totp_secret="A" * 32,
            rol="empresa",
            id_proyecto=id_proyecto,
        )
        db.add(usuario_empresa)
        await db.commit()
        return {
            "correo": creds["correo"],
            "password": creds["password"],
            "url_login": "/empresa/login",
            "regenerada": False,
        }


async def ampliar_cupo(db: AsyncSession, id_proyecto: int, nueva_capacidad: int) -> dict:
    """Amplía la capacidad de un proyecto. Debe ser mayor al cupo actual."""
    from fastapi import HTTPException

    proyecto = await db.get(Proyecto, id_proyecto)
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    if nueva_capacidad <= proyecto.capacidad_max:
        raise HTTPException(
            status_code=400,
            detail=f"La nueva capacidad ({nueva_capacidad}) debe ser mayor a la actual ({proyecto.capacidad_max})"
        )

    proyecto.capacidad_max = nueva_capacidad
    await db.commit()
    await db.refresh(proyecto)

    return {
        "id_proyecto": proyecto.id_proyecto,
        "nombre_proyecto": proyecto.nombre_proyecto,
        "capacidad_max": proyecto.capacidad_max,
        "cupo_actual": proyecto.cupo_actual,
    }
