"""
Servicio del módulo Empresa — validación de QR y procesamiento de inscripciones.
"""
import json
import time

import pyotp
from sqlalchemy import select
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
        select(Inscripcion).where(Inscripcion.id_proyecto == id_proyecto)
    )
    inscripciones = ins_result.scalars().all()

    return {
        "id_proyecto": proyecto.id_proyecto,
        "nombre_proyecto": proyecto.nombre_proyecto,
        "empresa": empresa.nombre_empresa,
        "evento": evento.nombre,
        "id_evento": proyecto.id_evento,
        "capacidad_max": proyecto.capacidad_max,
        "cupo_actual": proyecto.cupo_actual,
        "inscripciones_totales": len(inscripciones),
        "cupos_disponibles": max(0, proyecto.capacidad_max - proyecto.cupo_actual),
    }


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
