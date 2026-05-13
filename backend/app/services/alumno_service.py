"""
Servicio del módulo alumno — lógica de negocio para dashboard, QR dinámico
y consulta de estado de inscripción.
"""
import json
import time

from app.core.crypto import encrypt_qr_payload

import pyotp
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.empresa import Empresa
from app.models.evento import Evento
from app.models.inscripcion import Inscripcion
from app.models.proyecto import Proyecto
from app.models.usuario import Usuario
from app.models.usuario_evento import UsuarioEvento
from app.core.cache import cached


# ── Errores de negocio ────────────────────────────────────────────────────────

class AlumnoError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


# Campos del modelo que se pueden actualizar via PATCH /alumno/perfil
_PERFIL_CAMPOS_PERMITIDOS = {
    "correo_alterno", "celular", "descripcion_personal", "carrera", "semestre"
}

async def actualizar_perfil_alumno(db: AsyncSession, id_matricula: str, datos: dict) -> dict:
    """
    Actualiza los campos de perfil del alumno.
    Solo permite modificar los campos en _PERFIL_CAMPOS_PERMITIDOS.
    """
    result = await db.execute(select(Usuario).where(Usuario.id_matricula == id_matricula))
    usuario = result.scalar_one_or_none()
    if not usuario:
        raise AlumnoError("Usuario no encontrado", 404)

    # Solo actualizar campos permitidos que vengan en el payload
    for campo, valor in datos.items():
        if campo in _PERFIL_CAMPOS_PERMITIDOS and valor is not None:
            setattr(usuario, campo, valor)

    await db.commit()
    return {"ok": True, "mensaje": "Perfil actualizado correctamente"}



# ── Dashboards & helpers ──────────────────────────────────────────────────────

@cached(key="alum_cat_ev", ttl=30)
async def _get_catalogo_evento_cached(db: AsyncSession, evento_id: int) -> list[dict]:
    proyectos_result = await db.execute(
        select(Proyecto, Empresa)
        .join(Empresa, Proyecto.id_empresa == Empresa.id_empresa)
        .where(Proyecto.id_evento == evento_id)
        .order_by(Empresa.nombre_empresa, Proyecto.nombre_proyecto)
    )
    return [
        {
            "id_proyecto": p.id_proyecto,
            "nombre_proyecto": p.nombre_proyecto,
            "empresa": e.nombre_empresa,
            "descripcion": p.descripcion,
            "cupo_actual": p.cupo_actual,
            "capacidad_max": p.capacidad_max,
            "lleno": p.cupo_actual >= p.capacidad_max,
        }
        for p, e in proyectos_result.all()
    ]

async def obtener_datos_dashboard(db: AsyncSession, id_matricula: str) -> dict:
    """
    Reúne toda la información para renderizar el dashboard del alumno:
    - Datos del usuario (nombre, carrera, semestre)
    - Lista de eventos con los que se registró y su estado de inscripción actual
    """
    # Usuario
    result = await db.execute(
        select(Usuario).where(Usuario.id_matricula == id_matricula)
    )
    usuario = result.scalar_one_or_none()
    if not usuario:
        raise AlumnoError("Usuario no encontrado", 404)

    # Eventos registrados del alumno (con JOIN al nombre del evento)
    result = await db.execute(
        select(UsuarioEvento, Evento)
        .join(Evento, UsuarioEvento.id_evento == Evento.id_evento)
        .where(UsuarioEvento.id_matricula == id_matricula)
        .order_by(Evento.anio, Evento.id_evento)
    )
    rows = result.all()

    eventos_data = []
    for ue, evento in rows:
        # ¿Está inscrito en este evento?
        ins_result = await db.execute(
            select(Inscripcion).where(
                Inscripcion.id_matricula == id_matricula,
                Inscripcion.id_evento == evento.id_evento,
            )
        )
        inscripcion = ins_result.scalar_one_or_none()

        evento_info: dict = {
            "id_evento": evento.id_evento,
            "nombre": evento.nombre,
            "periodo": evento.periodo,
            "anio": evento.anio,
            "activo": evento.activo,
            "iniciado": evento.iniciado,
            "es_participante": ue.es_participante,
            "inscrito": inscripcion is not None,
            "inscripcion": None,
        }

        if inscripcion:
            proj_result = await db.execute(
                select(Proyecto, Empresa)
                .join(Empresa, Proyecto.id_empresa == Empresa.id_empresa)
                .where(Proyecto.id_proyecto == inscripcion.id_proyecto)
            )
            proj_row = proj_result.first()
            if proj_row:
                proyecto, empresa = proj_row
                evento_info["inscripcion"] = {
                    "id_proyecto": proyecto.id_proyecto,
                    "nombre_proyecto": proyecto.nombre_proyecto,
                    "empresa": empresa.nombre_empresa,
                    "descripcion": proyecto.descripcion,
                    "timestamp": inscripcion.timestamp.isoformat(),
                }

        # Proyectos disponibles para este evento (catálogo)
        evento_info["proyectos"] = await _get_catalogo_evento_cached(db, evento.id_evento)

        eventos_data.append(evento_info)

    return {
        "nombre": usuario.nombre,
        "matricula": usuario.id_matricula,
        "carrera": usuario.carrera,
        "semestre": usuario.semestre,
        "eventos": eventos_data,
    }


# ── QR Payload ────────────────────────────────────────────────────────────────

async def generar_qr_payload(
    db: AsyncSession, id_matricula: str, id_evento: int
) -> dict:
    """
    Genera el payload JSON que irá codificado en el QR dinámico.

    El totp_secret NUNCA sale del servidor — solo se expone el código TOTP
    ya calculado, dentro del payload serializado.

    Returns:
        {
          "qr_data": '{"matricula":"A0x","totp":"123456","id_evento":2,"correo":"...","tel":"...","desc":"..."}',
          "expira_en_segundos": 18,
          "ya_inscrito": false,
          "perfil_incompleto": false
        }
    Raises AlumnoError (403) si el alumno no tiene ese evento registrado.
    """
    # 1. Verificar registro del alumno EN el evento y recuperar el usuario de un jalón
    usr_ue_res = await db.execute(
        select(Usuario, UsuarioEvento)
        .join(UsuarioEvento, UsuarioEvento.id_matricula == Usuario.id_matricula)
        .where(
            Usuario.id_matricula == id_matricula,
            UsuarioEvento.id_evento == id_evento,
        )
    )
    row = usr_ue_res.first()
    if not row:
        raise AlumnoError("No estás registrado para este evento o tu usuario no se encontró", 403)

    usuario, usuario_evento = row

    evento_obj = await db.get(Evento, id_evento)
    if not evento_obj or not evento_obj.iniciado:
        raise AlumnoError("El periodo aún no ha sido iniciado por el administrador.", 403)
    if not usuario_evento.es_participante:
        raise AlumnoError("No estás registrado como participante de este periodo.", 403)

    # 2. Verificar si ya está inscrito
    ins_result = await db.execute(
        select(Inscripcion).where(
            Inscripcion.id_matricula == id_matricula,
            Inscripcion.id_evento == id_evento,
        )
    )
    if ins_result.scalar_one_or_none():
        return {"qr_data": None, "expira_en_segundos": 0, "ya_inscrito": True}

    # 4. Generar código TOTP y calcular segundos restantes del ciclo actual
    totp = pyotp.TOTP(usuario.totp_secret)
    codigo = totp.now()
    segundos_restantes = 30 - (int(time.time()) % 30)

    # 5. Verificar si el alumno ya completó su perfil de contacto.
    # Consideramos el perfil completo cuando al menos un dato de contacto fue capturado.
    perfil_incompleto = not any([
        usuario.celular,
        usuario.correo_alterno,
        usuario.descripcion_personal,
    ])

    if perfil_incompleto:
        return {
            "qr_data": None,
            "expira_en_segundos": segundos_restantes,
            "ya_inscrito": False,
            "perfil_incompleto": True,
            "datos_actuales": {
                "carrera": usuario.carrera,
                "semestre": usuario.semestre,
                "correo_alterno": usuario.correo_alterno,
                "celular": usuario.celular,
                "descripcion_personal": usuario.descripcion_personal,
            }
        }

    # 6. Construir payload del QR como string JSON
    payload = json.dumps({
        "matricula": id_matricula,
        "totp": codigo,
        "id_evento": id_evento,
    }, separators=(",", ":"))

    # Cifrar payload antes de enviarlo (Seguridad avanzada)
    encrypted_payload = encrypt_qr_payload(payload)

    return {
        "qr_data": encrypted_payload,
        "expira_en_segundos": segundos_restantes,
        "ya_inscrito": False,
        "perfil_incompleto": False,
        "datos_actuales": {
            "correo_alterno": usuario.correo_alterno,
            "celular": usuario.celular,
            "descripcion_personal": usuario.descripcion_personal
        }
    }


# ── Estado de inscripción ─────────────────────────────────────────────────────

async def obtener_estado_inscripcion(db: AsyncSession, id_matricula: str) -> dict:
    """
    Retorna el estado de inscripción del alumno en todos sus eventos registrados.
    """
    result = await db.execute(
        select(UsuarioEvento, Evento)
        .join(Evento, UsuarioEvento.id_evento == Evento.id_evento)
        .where(UsuarioEvento.id_matricula == id_matricula)
        .order_by(Evento.anio, Evento.id_evento)
    )
    rows = result.all()

    eventos_data = []
    for _ue, evento in rows:
        ins_result = await db.execute(
            select(Inscripcion).where(
                Inscripcion.id_matricula == id_matricula,
                Inscripcion.id_evento == evento.id_evento,
            )
        )
        inscripcion = ins_result.scalar_one_or_none()

        evento_info: dict = {
            "id_evento": evento.id_evento,
            "nombre_evento": evento.nombre,
            "inscrito": inscripcion is not None,
            "proyecto": None,
            "timestamp": None,
        }

        if inscripcion:
            proj_result = await db.execute(
                select(Proyecto, Empresa)
                .join(Empresa, Proyecto.id_empresa == Empresa.id_empresa)
                .where(Proyecto.id_proyecto == inscripcion.id_proyecto)
            )
            proj_row = proj_result.first()
            if proj_row:
                proyecto, empresa = proj_row
                evento_info["proyecto"] = {
                    "nombre": proyecto.nombre_proyecto,
                    "empresa": empresa.nombre_empresa,
                    "descripcion": proyecto.descripcion,
                }
                evento_info["timestamp"] = inscripcion.timestamp.isoformat()

        eventos_data.append(evento_info)


    return {"matricula": id_matricula, "eventos": eventos_data}


# ── Perfil Alumno ─────────────────────────────────────────────────────────────

async def actualizar_perfil_alumno(
    db: AsyncSession, id_matricula: str, data: dict
) -> dict:
    """
    Actualiza los campos adicionales del perfil del alumno.
    """
    result = await db.execute(
        select(Usuario).where(Usuario.id_matricula == id_matricula)
    )
    usuario = result.scalar_one_or_none()
    if not usuario:
        raise AlumnoError("Usuario no encontrado", 404)

    # Solo actualizar los campos permitidos
    if "correo_alterno" in data:
        usuario.correo_alterno = data["correo_alterno"]
    if "celular" in data:
        usuario.celular = data["celular"]
    if "descripcion_personal" in data:
        usuario.descripcion_personal = data["descripcion_personal"]

    await db.commit()
    await db.refresh(usuario)

    return {
        "ok": True,
        "correo_alterno": usuario.correo_alterno,
        "celular": usuario.celular,
        "descripcion_personal": usuario.descripcion_personal,
    }
