"""
Servicio del módulo Admin — lógica de negocio para gestión de proyectos.
"""
import secrets
import uuid

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import hash_password
from app.models.refresh_token import RefreshToken

from app.core.cache import cached, cache_delete, cache_delete_prefix
from app.core.pagination import paginate
from app.models.empresa import Empresa
from app.models.evento import Evento
from app.models.inscripcion import Inscripcion
from app.models.log_auditoria import LogAuditoria
from app.models.proyecto import Proyecto
from app.models.usuario import Usuario
from app.models.usuario_evento import UsuarioEvento


# ── Proyectos ─────────────────────────────────────────────────────────────────

@cached(key="admin_proyectos", ttl=15)
async def listar_proyectos(db: AsyncSession, page: int = 1, page_size: int = 20) -> dict:
    """Devuelve proyectos con datos de empresa y evento, paginados."""
    base_query = (
        select(Proyecto, Empresa, Evento)
        .join(Empresa, Proyecto.id_empresa == Empresa.id_empresa)
        .join(Evento, Proyecto.id_evento == Evento.id_evento)
        .order_by(Evento.id_evento, Empresa.nombre_empresa)
    )

    result = await paginate(db, base_query, page, page_size)
    rows = result["data"]

    proyecto_ids = [p.id_proyecto for p, _, _ in rows]
    inscripciones_por_proyecto: dict[int, list[dict]] = {pid: [] for pid in proyecto_ids}

    if proyecto_ids:
        inscripciones_result = await db.execute(
            select(Inscripcion)
            .options(selectinload(Inscripcion.usuario))
            .where(Inscripcion.id_proyecto.in_(proyecto_ids))
            .order_by(Inscripcion.timestamp.desc())
        )
        for inscripcion in inscripciones_result.scalars().all():
            alumno = inscripcion.usuario
            if not alumno:
                continue
            inscripciones_por_proyecto.setdefault(inscripcion.id_proyecto, []).append(
                {
                    "id_inscripcion": str(inscripcion.id_inscripcion),
                    "matricula": alumno.id_matricula,
                    "nombre": alumno.nombre,
                    "correo": alumno.correo,
                    "carrera": alumno.carrera,
                    "semestre": alumno.semestre,
                    "fecha_inscripcion": inscripcion.timestamp.isoformat() if inscripcion.timestamp else None,
                }
            )

    result["data"] = [
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
            "cupos_disponibles": max(0, p.capacidad_max - p.cupo_actual),
            "ocupacion_porcentaje": round((p.cupo_actual / p.capacidad_max) * 100) if p.capacidad_max else 0,
            "evento_activo": ev.activo,
            "inscripciones_totales": len(inscripciones_por_proyecto.get(p.id_proyecto, [])),
            "alumnos_inscritos": inscripciones_por_proyecto.get(p.id_proyecto, []),
            "estado": (
                "LLENO" if p.cupo_actual >= p.capacidad_max
                else "CASI LLENO" if p.cupo_actual >= p.capacidad_max * 0.8
                else "DISPONIBLE"
            ),
        }
        for p, e, ev in rows
    ]

    return result


async def listar_empresas(db: AsyncSession) -> list[dict]:
    """Devuelve todas las empresas."""
    result = await db.execute(select(Empresa).order_by(Empresa.nombre_empresa))
    return [
        {"id_empresa": e.id_empresa, "nombre_empresa": e.nombre_empresa}
        for e in result.scalars().all()
    ]


async def listar_eventos(db: AsyncSession) -> list[dict]:
    """Devuelve todos los eventos."""
    from app.models.usuario_evento import UsuarioEvento
    from sqlalchemy import func as sa_func

    result = await db.execute(select(Evento).order_by(Evento.id_evento))
    eventos = result.scalars().all()

    counts_res = await db.execute(
        select(
            UsuarioEvento.id_evento,
            sa_func.count(UsuarioEvento.id).filter(UsuarioEvento.es_participante.is_(True)).label("participantes"),
            sa_func.count(UsuarioEvento.id).label("registrados"),
        ).group_by(UsuarioEvento.id_evento)
    )
    counts = {row.id_evento: (row.participantes, row.registrados) for row in counts_res}

    return [
        {
            "id_evento": ev.id_evento,
            "nombre": ev.nombre,
            "periodo": ev.periodo,
            "anio": ev.anio,
            "activo": ev.activo,
            "iniciado": ev.iniciado,
            "fecha_inicio_real": ev.fecha_inicio_real.isoformat() if ev.fecha_inicio_real else None,
            "participantes": counts.get(ev.id_evento, (0, 0))[0],
            "registrados": counts.get(ev.id_evento, (0, 0))[1],
        }
        for ev in eventos
    ]


async def iniciar_evento(db: AsyncSession, id_evento: int) -> dict:
    """Marca evento como iniciado y congela como participantes solo a los pre-registrados."""
    from fastapi import HTTPException
    from datetime import datetime, timezone
    from sqlalchemy import update
    from app.models.usuario_evento import UsuarioEvento

    evento = await db.get(Evento, id_evento)
    if not evento:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    if evento.iniciado:
        raise HTTPException(status_code=409, detail="El evento ya fue iniciado")

    # Solo los alumnos que hicieron pre-registro a tiempo se convierten en participantes
    res = await db.execute(
        update(UsuarioEvento)
        .where(UsuarioEvento.id_evento == id_evento)
        .where(UsuarioEvento.es_participante.is_(False))
        .where(UsuarioEvento.preregistrado.is_(True))
        .values(es_participante=True)
    )
    congelados = res.rowcount or 0

    evento.iniciado = True
    evento.preregistro_abierto = False  # Cierra la ventana si aún estaba abierta
    evento.fecha_inicio_real = datetime.now(timezone.utc)
    await db.commit()
    await cache_delete_prefix("admin_")
    await cache_delete("alum_cat_ev")
    return {
        "id_evento": evento.id_evento,
        "iniciado": True,
        "fecha_inicio_real": evento.fecha_inicio_real.isoformat(),
        "participantes_congelados": congelados,
    }


async def crear_evento(db: AsyncSession, datos) -> dict:
    """Crea un nuevo evento y lo activa, desactivando el anterior."""
    # Desactivar evento actual
    result = await db.execute(select(Evento).where(Evento.activo == True))
    for ev in result.scalars().all():
        ev.activo = False

    nuevo = Evento(
        nombre=datos.nombre,
        periodo=datos.periodo,
        anio=datos.anio,
        activo=True,
        fecha_inicio=datos.fecha_inicio,
        fecha_fin=datos.fecha_fin,
    )
    db.add(nuevo)
    await db.commit()
    await db.refresh(nuevo)
    await cache_delete_prefix("admin_")
    await cache_delete("ocupacion_eventos")
    return {
        "id_evento": nuevo.id_evento,
        "nombre": nuevo.nombre,
        "periodo": nuevo.periodo,
        "anio": nuevo.anio,
        "activo": nuevo.activo,
    }


async def crear_proyecto(db: AsyncSession, datos) -> dict:
    """
    Crea un nuevo proyecto para una empresa y evento.
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
    )
    db.add(proyecto)
    await db.flush()  # Obtener el id_proyecto antes del commit

    await db.commit()
    await db.refresh(proyecto)

    await cache_delete("kpis")
    await cache_delete("ocupacion_eventos")
    await cache_delete_prefix("admin_proyectos")

    return {
        "id_proyecto": proyecto.id_proyecto,
        "nombre_proyecto": proyecto.nombre_proyecto,
        "empresa": empresa.nombre_empresa,
        "evento": evento.nombre,
        "capacidad_max": proyecto.capacidad_max,
        "cupo_actual": 0,
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

    await cache_delete("kpis")
    await cache_delete("ocupacion_eventos")
    await cache_delete_prefix("admin_proyectos")

    return {
        "id_proyecto": proyecto.id_proyecto,
        "nombre_proyecto": proyecto.nombre_proyecto,
        "capacidad_max": proyecto.capacidad_max,
        "cupo_actual": proyecto.cupo_actual,
    }


async def eliminar_inscripcion(
    db: AsyncSession,
    id_inscripcion: str,
    actor_matricula: str | None = None,
    ip_origen: str | None = None,
) -> dict:
    """Elimina una inscripción y ajusta el cupo del proyecto asociado."""
    from fastapi import HTTPException

    try:
        inscripcion_uuid = uuid.UUID(str(id_inscripcion))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="id_inscripcion inválido") from exc

    result = await db.execute(
        select(Inscripcion)
        .options(
            selectinload(Inscripcion.usuario),
            selectinload(Inscripcion.proyecto).selectinload(Proyecto.empresa)
        )
        .where(Inscripcion.id_inscripcion == inscripcion_uuid)
    )
    inscripcion = result.scalar_one_or_none()
    if not inscripcion:
        raise HTTPException(status_code=404, detail="Inscripción no encontrada")

    proyecto = inscripcion.proyecto
    alumno = inscripcion.usuario

    if proyecto and proyecto.cupo_actual > 0:
        proyecto.cupo_actual -= 1

    db.add(
        LogAuditoria(
            tipo_evento="INSCRIPCION_ELIMINADA_ADMIN",
            id_matricula=actor_matricula,
            ip_origen=ip_origen,
            detalle=(
                f"Admin eliminó inscripción {inscripcion.id_inscripcion} de "
                f"{alumno.id_matricula if alumno else 'N/A'} "
                f"en proyecto {proyecto.id_proyecto if proyecto else 'N/A'}"
            ),
        )
    )

    await db.delete(inscripcion)
    await db.commit()

    await cache_delete("kpis")
    await cache_delete("ocupacion_eventos")
    await cache_delete("alumnos_por_empresa")
    await cache_delete("alumnos_por_carrera")
    await cache_delete_prefix("admin_proyectos")

    return {
        "ok": True,
        "mensaje": "Inscripción eliminada correctamente",
        "id_proyecto": proyecto.id_proyecto if proyecto else None,
        "cupo_actual": proyecto.cupo_actual if proyecto else None,
        "nombre_alumno": alumno.nombre if alumno else None,
        "correo_alumno": alumno.correo if alumno else None,
        "nombre_proyecto": proyecto.nombre_proyecto if proyecto else None,
        "nombre_empresa": (proyecto.empresa.nombre_empresa if proyecto and proyecto.empresa else None)
    }


async def listar_alumnos_disponibles(db: AsyncSession, id_evento: int) -> list[dict]:
    """
    Retorna los alumnos registrados en un evento que no están inscritos en ningún proyecto.
    """
    # 1. Obtener todos los alumnos registrados en el evento
    result = await db.execute(
        select(Usuario)
        .join(UsuarioEvento, Usuario.id_matricula == UsuarioEvento.id_matricula)
        .where(UsuarioEvento.id_evento == id_evento)
        .order_by(Usuario.nombre)
    )
    alumnos = result.scalars().all()

    # 2. Obtener todos los alumnos inscritos en proyectos de este evento
    ins_result = await db.execute(
        select(Inscripcion.id_matricula.distinct()).where(
            Inscripcion.id_evento == id_evento
        )
    )
    inscritos = {row[0] for row in ins_result.all()}

    # 3. Retornar solo los que no están inscritos
    return [
        {
            "id_matricula": a.id_matricula,
            "nombre": a.nombre,
            "carrera": a.carrera,
            "semestre": a.semestre,
            "correo": a.correo,
        }
        for a in alumnos
        if a.id_matricula not in inscritos
    ]


async def crear_inscripcion(
    db: AsyncSession,
    id_matricula: str,
    id_proyecto: int,
    actor_matricula: str | None = None,
    ip_origen: str | None = None,
) -> dict:
    """
    Crea una nueva inscripción de alumno en un proyecto.
    Valida que el alumno existe, está registrado en el evento y tiene cupo disponible.
    """
    from fastapi import HTTPException

    # 1. Verificar que el alumno existe
    result = await db.execute(
        select(Usuario).where(Usuario.id_matricula == id_matricula)
    )
    alumno = result.scalar_one_or_none()
    if not alumno:
        raise HTTPException(status_code=404, detail=f"Alumno {id_matricula} no encontrado")

    # 2. Verificar que el proyecto existe
    result = await db.execute(
        select(Proyecto)
        .options(selectinload(Proyecto.empresa), selectinload(Proyecto.evento))
        .where(Proyecto.id_proyecto == id_proyecto)
    )
    proyecto = result.scalar_one_or_none()
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    # 3. Verificar que el alumno está registrado en el evento
    ue_result = await db.execute(
        select(UsuarioEvento).where(
            UsuarioEvento.id_matricula == id_matricula,
            UsuarioEvento.id_evento == proyecto.id_evento,
        )
    )
    if not ue_result.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail=f"El alumno {id_matricula} no está registrado en el evento",
        )

    # 4. Verificar que no está ya inscrito en otro proyecto del mismo evento
    ins_result = await db.execute(
        select(Inscripcion).where(
            Inscripcion.id_matricula == id_matricula,
            Inscripcion.id_evento == proyecto.id_evento,
        )
    )
    if ins_result.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail=f"El alumno ya está inscrito en un proyecto de este evento",
        )

    # 5. Verificar que el proyecto tiene cupo disponible
    if proyecto.cupo_actual >= proyecto.capacidad_max:
        raise HTTPException(
            status_code=400,
            detail="El proyecto está lleno. No hay cupo disponible",
        )

    # 6. Crear la inscripción
    inscripcion = Inscripcion(
        id_inscripcion=uuid.uuid4(),
        id_matricula=id_matricula,
        id_proyecto=id_proyecto,
        id_evento=proyecto.id_evento,
    )
    proyecto.cupo_actual += 1
    db.add(inscripcion)

    # 7. Registrar en auditoría
    db.add(
        LogAuditoria(
            tipo_evento="INSCRIPCION_CREADA_ADMIN",
            id_matricula=actor_matricula,
            ip_origen=ip_origen,
            detalle=(
                f"Admin agregó inscripción de {id_matricula} ({alumno.nombre}) "
                f"al proyecto {proyecto.id_proyecto} ({proyecto.nombre_proyecto})"
            ),
        )
    )

    await db.commit()
    await db.refresh(proyecto)

    await cache_delete("kpis")
    await cache_delete("ocupacion_eventos")
    await cache_delete("alumnos_por_empresa")
    await cache_delete("alumnos_por_carrera")
    await cache_delete_prefix("admin_proyectos")

    return {
        "ok": True,
        "mensaje": f"{alumno.nombre} ha sido inscrito exitosamente",
        "id_inscripcion": str(inscripcion.id_inscripcion),
        "id_proyecto": proyecto.id_proyecto,
        "nombre_alumno": alumno.nombre,
        "cupo_actual": proyecto.cupo_actual,
        "capacidad_max": proyecto.capacidad_max,
        "correo_alumno": alumno.correo,
        "nombre_proyecto": proyecto.nombre_proyecto,
        "nombre_empresa": proyecto.empresa.nombre_empresa if proyecto.empresa else None,
    }


# ── Usuarios Empresa ──────────────────────────────────────────────────────────

async def listar_usuarios_empresa(db: AsyncSession) -> list[dict]:
    """Lista todos los usuarios de tipo empresa con datos de la empresa vinculada."""
    result = await db.execute(
        select(Usuario, Empresa)
        .outerjoin(Empresa, Usuario.id_empresa == Empresa.id_empresa)
        .where(Usuario.rol == "empresa")
        .order_by(Empresa.nombre_empresa)
    )
    return [
        {
            "id_matricula": u.id_matricula,
            "nombre": u.nombre,
            "correo": u.correo,
            "id_empresa": u.id_empresa,
            "nombre_empresa": e.nombre_empresa if e else None,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u, e in result.all()
    ]


async def resetear_password_empresa(db: AsyncSession, id_matricula: str) -> dict:
    """
    Resetea la contraseña de un usuario empresa y retorna la nueva contraseña en texto plano.
    Se usa cuando el admin necesita recuperar/regenerar las credenciales de acceso.
    """
    from fastapi import HTTPException

    result = await db.execute(
        select(Usuario, Empresa)
        .outerjoin(Empresa, Usuario.id_empresa == Empresa.id_empresa)
        .where(Usuario.id_matricula == id_matricula, Usuario.rol == "empresa")
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Usuario empresa no encontrado")

    usuario, empresa = row

    nueva_password = secrets.token_urlsafe(12)
    usuario.password_hash = hash_password(nueva_password)

    db.add(
        LogAuditoria(
            tipo_evento="PASSWORD_RESET_ADMIN",
            id_matricula=usuario.id_matricula,
            detalle=f"Admin reseteó contraseña para usuario empresa: {usuario.correo}",
        )
    )

    await db.commit()

    return {
        "id_matricula": usuario.id_matricula,
        "nombre": usuario.nombre,
        "correo": usuario.correo,
        "password": nueva_password,
        "nombre_empresa": empresa.nombre_empresa if empresa else None,
    }


# ── Credenciales (reset de contraseñas) ───────────────────────────────────────

# Roles cuyas contraseñas el admin puede resetear desde el panel.
# Alumnos quedan fuera: ellos usan el flujo de Google login / OTP por separado.
_RESETTABLE_ROLES = ("admin", "empresa")


# ── Pre-registro ──────────────────────────────────────────────────────────────

async def cerrar_preregistro(db: AsyncSession, id_evento: int) -> dict:
    """
    Cierra la ventana de pre-registro de un evento.
    A partir de este momento, los nuevos alumnos que se logueen
    quedarán con preregistrado=False y no podrán ver el QR.
    """
    result = await db.execute(select(Evento).where(Evento.id_evento == id_evento))
    evento = result.scalar_one_or_none()
    if not evento:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Evento no encontrado")

    evento.preregistro_abierto = False
    await db.commit()
    await cache_delete_prefix("admin_")
    await cache_delete("ocupacion_eventos")
    return {"ok": True, "mensaje": "Pre-registro cerrado. Los nuevos registros no podrán ver el QR."}


async def listar_credenciales(db: AsyncSession) -> list[dict]:
    """Lista usuarios con rol admin/empresa para el panel de credenciales."""
    result = await db.execute(
        select(Usuario, Empresa)
        .join(Empresa, Usuario.id_empresa == Empresa.id_empresa, isouter=True)
        .where(
            Usuario.rol.in_(_RESETTABLE_ROLES),
            Usuario.is_google_login.is_(False),
        )
        .order_by(Usuario.rol, Usuario.nombre)
    )
    return [
        {
            "id_matricula": u.id_matricula,
            "nombre": u.nombre,
            "correo": u.correo,
            "rol": u.rol,
            "id_empresa": u.id_empresa,
            "nombre_empresa": e.nombre_empresa if e else None,
        }
        for u, e in result.all()
    ]


async def reset_password_usuario(
    db: AsyncSession,
    id_matricula: str,
    actor_matricula: str,
    ip_origen: str | None,
) -> dict:
    """
    Genera una contraseña nueva para el usuario indicado, la hashea y revoca
    todos sus refresh tokens. Devuelve el password en plano (solo una vez).

    Reglas:
      - Solo se permite resetear usuarios con rol admin/empresa.
      - El admin no puede resetear su propia cuenta (evita lockout).
    """
    from fastapi import HTTPException

    if id_matricula == actor_matricula:
        raise HTTPException(
            status_code=400,
            detail="No puedes resetear tu propia contraseña desde este panel.",
        )

    result = await db.execute(select(Usuario).where(Usuario.id_matricula == id_matricula))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if user.rol not in _RESETTABLE_ROLES:
        raise HTTPException(
            status_code=400,
            detail=f"No se puede resetear contraseña de usuarios con rol '{user.rol}'.",
        )

    if user.is_google_login:
        raise HTTPException(
            status_code=400,
            detail="Este usuario inicia sesión con Google y no tiene contraseña local.",
        )

    new_password = secrets.token_urlsafe(12)
    user.password_hash = hash_password(new_password)
    user.failed_login_attempts = 0
    user.locked_until = None

    await db.execute(
        update(RefreshToken)
        .where(RefreshToken.id_matricula == id_matricula, RefreshToken.revocado.is_(False))
        .values(revocado=True)
    )

    db.add(
        LogAuditoria(
            tipo_evento="PASSWORD_RESET_ADMIN",
            id_matricula=actor_matricula,
            ip_origen=ip_origen,
            detalle=f"Admin {actor_matricula} reseteó contraseña de {id_matricula} (rol={user.rol})",
        )
    )

    await db.commit()

    return {
        "ok": True,
        "id_matricula": user.id_matricula,
        "correo": user.correo,
        "password": new_password,
        "shown_once": True,
    }


# ── Carga de CSV ──────────────────────────────────────────────────────────────

async def procesar_csv_empresas_proyectos(
    db: AsyncSession,
    csv_content: str,
    id_evento: int,
) -> dict:
    """
    Procesa un CSV con empresas y proyectos.
    Formato esperado: nombre_empresa,logo_url,nombre_proyecto,descripcion_proyecto,capacidad_max

    Crea empresas si no existen y siempre crea nuevos proyectos.
    Retorna resumen de registros creados.
    """
    import csv
    import io
    from fastapi import HTTPException

    # Validar que el evento existe
    evento = await db.get(Evento, id_evento)
    if not evento:
        raise HTTPException(status_code=404, detail=f"Evento con id {id_evento} no encontrado")

    # Parse CSV
    reader = csv.DictReader(io.StringIO(csv_content))
    expected_columns = {"nombre_empresa", "logo_url", "nombre_proyecto", "descripcion_proyecto", "capacidad_max"}

    if not reader.fieldnames or not set(reader.fieldnames).issuperset(expected_columns):
        raise HTTPException(
            status_code=400,
            detail=f"CSV debe contener las columnas: {', '.join(expected_columns)}"
        )

    empresas_creadas = 0
    proyectos_creados = 0
    errores = []

    # Cache de empresas para no repetir queries
    empresas_cache = {}

    for idx, row in enumerate(reader, start=2):  # start=2 porque la fila 1 son headers
        try:
            nombre_empresa = (row.get("nombre_empresa") or "").strip()
            logo_url = (row.get("logo_url") or "").strip() or None
            nombre_proyecto = (row.get("nombre_proyecto") or "").strip()
            descripcion = (row.get("descripcion_proyecto") or "").strip() or None
            capacidad_str = (row.get("capacidad_max") or "").strip()

            # Validaciones básicas
            if not nombre_empresa:
                errores.append(f"Fila {idx}: nombre_empresa vacío")
                continue

            if not nombre_proyecto:
                errores.append(f"Fila {idx}: nombre_proyecto vacío")
                continue

            try:
                capacidad_max = int(capacidad_str)
                if capacidad_max <= 0:
                    raise ValueError()
            except ValueError:
                errores.append(f"Fila {idx}: capacidad_max debe ser un número positivo (recibido: {capacidad_str})")
                continue

            # Buscar o crear empresa
            if nombre_empresa in empresas_cache:
                empresa = empresas_cache[nombre_empresa]
            else:
                result = await db.execute(
                    select(Empresa).where(Empresa.nombre_empresa == nombre_empresa)
                )
                empresa = result.scalar_one_or_none()

                if not empresa:
                    empresa = Empresa(
                        nombre_empresa=nombre_empresa,
                        logo_url=logo_url,
                    )
                    db.add(empresa)
                    await db.flush()  # Para obtener id_empresa
                    empresas_creadas += 1

                empresas_cache[nombre_empresa] = empresa

            # Crear proyecto
            proyecto = Proyecto(
                id_empresa=empresa.id_empresa,
                id_evento=id_evento,
                nombre_proyecto=nombre_proyecto,
                descripcion=descripcion,
                capacidad_max=capacidad_max,
                cupo_actual=0,
            )
            db.add(proyecto)
            proyectos_creados += 1

        except Exception as e:
            errores.append(f"Fila {idx}: Error inesperado - {str(e)}")

    await db.commit()

    # Limpiar cache
    await cache_delete("kpis")
    await cache_delete("ocupacion_eventos")
    await cache_delete_prefix("admin_proyectos")

    return {
        "ok": True,
        "empresas_creadas": empresas_creadas,
        "proyectos_creados": proyectos_creados,
        "errores": errores,
        "total_errores": len(errores),
    }
