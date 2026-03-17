"""
Servicio del módulo Empresa — validación de QR y procesamiento de inscripciones.
"""
import json
import time

import pyotp
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.inscripcion import Inscripcion
from app.models.proyecto import Proyecto
from app.models.usuario import Usuario
from app.models.usuario_evento import UsuarioEvento


class EscanerError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


def _first_attr(obj, names, default=None):
    for name in names:
        value = getattr(obj, name, None)
        if value not in (None, ""):
            return value
    return default


async def obtener_info_proyecto(db: AsyncSession, id_proyecto: int) -> dict:
    """Devuelve la info del proyecto asignado al representante de empresa."""
    from app.models.empresa import Empresa
    from app.models.evento import Evento

    result = await db.execute(
        select(Proyecto, Empresa, Evento)
        .join(Empresa, Proyecto.id_empresa == Empresa.id_empresa)
        .join(Evento, Proyecto.id_evento == Evento.id_evento)
        .where(Proyecto.id_proyecto == id_proyecto)
    )
    row = result.first()
    if not row:
        raise EscanerError("Proyecto no encontrado", 404)

    proyecto, empresa, evento = row

    # Contar inscripciones confirmadas
    ins_result = await db.execute(
        select(Inscripcion)
        .options(selectinload(Inscripcion.usuario))
        .where(Inscripcion.id_proyecto == id_proyecto)
        .order_by(Inscripcion.timestamp.desc())
    )
    inscripciones = ins_result.scalars().all()

    alumnos_inscritos = []
    for inscripcion in inscripciones:
        alumno = inscripcion.usuario
        if not alumno:
            continue
        alumnos_inscritos.append(
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

    ocupacion_pct = round((proyecto.cupo_actual / proyecto.capacidad_max) * 100) if proyecto.capacidad_max else 0
    razon_social = _first_attr(empresa, ["razon_social", "nombre_fiscal", "nombre_empresa"], empresa.nombre_empresa)
    id_asociado = _first_attr(empresa, ["id_asociado", "codigo_asociado", "codigo_empresa"])
    direccion = _first_attr(empresa, ["direccion", "domicilio", "calle"])
    semestre = _first_attr(evento, ["semestre", "periodo"])

    return {
        "id_proyecto": proyecto.id_proyecto,
        "nombre_proyecto": proyecto.nombre_proyecto,
        "descripcion": proyecto.descripcion,
        "empresa": empresa.nombre_empresa,
        "razon_social": razon_social,
        "id_asociado": id_asociado,
        "direccion": direccion,
        "logo_url": getattr(empresa, "logo_url", None),
        "evento": evento.nombre,
        "id_evento": proyecto.id_evento,
        "periodo": evento.periodo,
        "anio": evento.anio,
        "semestre": semestre,
        "evento_activo": evento.activo,
        "capacidad_max": proyecto.capacidad_max,
        "capacidad_espera_max": proyecto.capacidad_espera_max,
        "cupo_actual": proyecto.cupo_actual,
        "inscripciones_totales": len(inscripciones),
        "cupos_disponibles": max(0, proyecto.capacidad_max - proyecto.cupo_actual),
        "ocupacion_porcentaje": ocupacion_pct,
        "alumnos_inscritos": alumnos_inscritos,
    }


async def obtener_id_empresa_de_proyecto(db: AsyncSession, id_proyecto: int) -> int:
    """Devuelve el id_empresa dueño de un proyecto."""
    result = await db.execute(
        select(Proyecto.id_empresa).where(Proyecto.id_proyecto == id_proyecto)
    )
    id_empresa = result.scalar_one_or_none()
    if not id_empresa:
        raise EscanerError("Proyecto no encontrado", 404)
    return id_empresa


async def proyecto_pertenece_a_empresa(db: AsyncSession, id_empresa: int, id_proyecto: int) -> bool:
    """Valida que un proyecto pertenezca a una empresa."""
    result = await db.execute(
        select(Proyecto.id_proyecto).where(
            Proyecto.id_proyecto == id_proyecto,
            Proyecto.id_empresa == id_empresa,
        )
    )
    return result.scalar_one_or_none() is not None


async def obtener_proyectos_empresa(db: AsyncSession, id_empresa: int) -> list[dict]:
    """Lista los proyectos/eventos asociados a una empresa."""
    from app.models.evento import Evento

    result = await db.execute(
        select(Proyecto, Evento)
        .join(Evento, Proyecto.id_evento == Evento.id_evento)
        .where(Proyecto.id_empresa == id_empresa)
        .order_by(Evento.activo.desc(), Evento.anio.desc(), Evento.periodo.desc(), Proyecto.nombre_proyecto.asc())
    )

    rows = result.all()
    proyectos = []
    for proyecto, evento in rows:
        ocupacion_pct = round((proyecto.cupo_actual / proyecto.capacidad_max) * 100) if proyecto.capacidad_max else 0
        proyectos.append(
            {
                "id_proyecto": proyecto.id_proyecto,
                "id_evento": proyecto.id_evento,
                "nombre_proyecto": proyecto.nombre_proyecto,
                "evento": evento.nombre,
                "periodo": evento.periodo,
                "anio": evento.anio,
                "evento_activo": evento.activo,
                "cupo_actual": proyecto.cupo_actual,
                "capacidad_max": proyecto.capacidad_max,
                "ocupacion_porcentaje": ocupacion_pct,
            }
        )

    return proyectos


async def validar_y_inscribir(
    db: AsyncSession,
    id_proyecto: int,
    qr_raw: str,
) -> dict:
    """
    Valida el QR escaneado y, si es válido, inscribe al alumno en el proyecto.

    El QR contiene: {"matricula": "A01234567", "totp": "123456", "id_evento": 2}

    Returns:
        {"ok": True/False, "mensaje": str, "nombre_alumno": str|None}
    """
    # 1. Parsear el QR
    try:
        data = json.loads(qr_raw)
        matricula = str(data["matricula"])
        totp_code = str(data["totp"])
        id_evento_qr = int(data["id_evento"])
    except (json.JSONDecodeError, KeyError, TypeError):
        raise EscanerError("QR inválido o con formato incorrecto", 400)

    # 2. Verificar que el proyecto es del mismo evento que el QR
    proyecto = await db.get(Proyecto, id_proyecto)
    if not proyecto:
        raise EscanerError("Proyecto no encontrado", 404)

    if proyecto.id_evento != id_evento_qr:
        raise EscanerError(
            f"El QR es para el evento {id_evento_qr}, pero este proyecto es del evento {proyecto.id_evento}",
            400,
        )

    # 3. Buscar el alumno
    result = await db.execute(
        select(Usuario).where(Usuario.id_matricula == matricula)
    )
    alumno = result.scalar_one_or_none()
    if not alumno:
        raise EscanerError(f"Alumno {matricula} no encontrado", 404)

    # 4. Verificar que el alumno está registrado para este evento
    ue_result = await db.execute(
        select(UsuarioEvento).where(
            UsuarioEvento.id_matricula == matricula,
            UsuarioEvento.id_evento == id_evento_qr,
        )
    )
    if not ue_result.scalar_one_or_none():
        return {
            "ok": False,
            "mensaje": f"{alumno.nombre} no está registrado para este evento",
            "nombre_alumno": alumno.nombre,
        }

    # 5. Verificar que no esté ya inscrito en ALGÚN proyecto de este evento
    ins_result = await db.execute(
        select(Inscripcion).where(
            Inscripcion.id_matricula == matricula,
            Inscripcion.id_evento == id_evento_qr,
        )
    )
    if ins_result.scalar_one_or_none():
        return {
            "ok": False,
            "mensaje": f"{alumno.nombre} ya está inscrito en un proyecto de este evento",
            "nombre_alumno": alumno.nombre,
        }

    # 6. Verificar el TOTP (ventana de ±1 para tolerancia de reloj)
    totp = pyotp.TOTP(alumno.totp_secret)
    if not totp.verify(totp_code, valid_window=1):
        return {
            "ok": False,
            "mensaje": "Código QR expirado o inválido — pide al alumno que refresque",
            "nombre_alumno": alumno.nombre,
        }

    # 7. Verificar cupo disponible
    if proyecto.cupo_actual >= proyecto.capacidad_max:
        return {
            "ok": False,
            "mensaje": f"Proyecto lleno ({proyecto.cupo_actual}/{proyecto.capacidad_max})",
            "nombre_alumno": alumno.nombre,
        }

    # 8. Todo ok — inscribir
    inscripcion = Inscripcion(
        id_matricula=matricula,
        id_proyecto=id_proyecto,
        id_evento=id_evento_qr,
    )
    proyecto.cupo_actual += 1
    db.add(inscripcion)
    await db.commit()
    await db.refresh(proyecto)

    return {
        "ok": True,
        "mensaje": f"¡{alumno.nombre} inscrito exitosamente!",
        "nombre_alumno": alumno.nombre,
        "cupo_actual": proyecto.cupo_actual,
        "capacidad_max": proyecto.capacidad_max,
    }
