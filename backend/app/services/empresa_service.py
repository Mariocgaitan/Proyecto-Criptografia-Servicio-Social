"""
Servicio del módulo Empresa — lógica transaccional para validar QR e inscribir alumnos.

El flujo completo de validar_qr_e_inscribir:
  1. Verificar TOTP (RFC 6238, valid_window=1)
  2. Obtener el id_evento del proyecto
  3. Verificar que el alumno esté registrado para ese evento
  4. Verificar que el alumno no esté ya inscrito en ese evento
  5. BEGIN TRANSACTION con SELECT FOR UPDATE en el proyecto
  6a. Si hay cupo → INSERT inscripcion + UPDATE cupo_actual + DELETE lista_espera del evento
  6b. Si no hay cupo pero hay lista espera → INSERT lista_espera
  6c. Si no hay cupo ni lista espera → HTTP 409
  7. Log de auditoría
"""
import pyotp
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.empresa import Empresa
from app.models.evento import Evento
from app.models.inscripcion import Inscripcion
from app.models.lista_espera import ListaEspera
from app.models.log_auditoria import LogAuditoria
from app.models.proyecto import Proyecto
from app.models.usuario import Usuario
from app.models.usuario_evento import UsuarioEvento


# ── Errores de negocio ────────────────────────────────────────────────────────

class ValidacionError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


# ── Auditoría interna ─────────────────────────────────────────────────────────

async def _log(
    db: AsyncSession,
    tipo_evento: str,
    id_matricula: str | None = None,
    id_proyecto: int | None = None,
    ip_origen: str | None = None,
    detalle: str | None = None,
) -> None:
    db.add(LogAuditoria(
        tipo_evento=tipo_evento,
        id_matricula=id_matricula,
        ip_origen=ip_origen,
        detalle=detalle,
    ))


# ── Datos del proyecto para la vista del escáner ──────────────────────────────

async def obtener_datos_proyecto(db: AsyncSession, id_proyecto: int) -> dict:
    """
    Retorna los datos del proyecto y su evento para renderizar la vista del escáner.
    Raises ValidacionError (404) si el proyecto no existe.
    """
    result = await db.execute(
        select(Proyecto, Empresa, Evento)
        .join(Empresa, Proyecto.id_empresa == Empresa.id_empresa)
        .join(Evento, Proyecto.id_evento == Evento.id_evento)
        .where(Proyecto.id_proyecto == id_proyecto)
    )
    row = result.first()
    if not row:
        raise ValidacionError("Proyecto no encontrado", 404)

    proyecto, empresa, evento = row

    # Posiciones en lista de espera
    espera_count_result = await db.execute(
        select(func.count()).where(ListaEspera.id_proyecto == id_proyecto)
    )
    en_espera = espera_count_result.scalar() or 0

    return {
        "id_proyecto": proyecto.id_proyecto,
        "nombre_proyecto": proyecto.nombre_proyecto,
        "descripcion": proyecto.descripcion,
        "capacidad_max": proyecto.capacidad_max,
        "cupo_actual": proyecto.cupo_actual,
        "cupo_disponible": max(0, proyecto.capacidad_max - proyecto.cupo_actual),
        "capacidad_espera_max": proyecto.capacidad_espera_max,
        "en_espera": en_espera,
        "empresa": empresa.nombre_empresa,
        "evento": evento.nombre,
        "id_evento": evento.id_evento,
    }


# ── Validación y inscripción ───────────────────────────────────────────────────

async def validar_qr_e_inscribir(
    db: AsyncSession,
    matricula: str,
    totp_leido: str,
    id_proyecto: int,
    ip_origen: str | None = None,
) -> dict:
    """
    Endpoint transaccional crítico. Valida el QR e inscribe al alumno.

    Returns dict con:
        status: "inscrito" | "lista_espera"
        message: str
        alumno: str
        proyecto: str
        evento: str
        posicion: int | None  (solo si lista_espera)

    Raises ValidacionError con el status_code correcto en cada caso de error.
    """

    # ── 1. Verificar TOTP ────────────────────────────────────────────────────
    usr_result = await db.execute(
        select(Usuario).where(Usuario.id_matricula == matricula)
    )
    usuario = usr_result.scalar_one_or_none()

    if not usuario:
        await _log(db, "TOTP_INVALIDO", id_matricula=matricula, ip_origen=ip_origen,
                   detalle="Matrícula no encontrada")
        await db.commit()
        raise ValidacionError("Código QR expirado o inválido", 400)

    totp = pyotp.TOTP(usuario.totp_secret)
    if not totp.verify(totp_leido, valid_window=1):
        await _log(db, "TOTP_INVALIDO", id_matricula=matricula, ip_origen=ip_origen,
                   id_proyecto=id_proyecto, detalle="TOTP incorrecto")
        await db.commit()
        raise ValidacionError("Código QR expirado o inválido", 400)

    # ── 2. Obtener el evento del proyecto ────────────────────────────────────
    proj_result = await db.execute(
        select(Proyecto, Empresa, Evento)
        .join(Empresa, Proyecto.id_empresa == Empresa.id_empresa)
        .join(Evento, Proyecto.id_evento == Evento.id_evento)
        .where(Proyecto.id_proyecto == id_proyecto)
    )
    proj_row = proj_result.first()
    if not proj_row:
        raise ValidacionError("Proyecto no encontrado", 404)

    proyecto, empresa, evento = proj_row

    # ── 3. Verificar que el alumno esté registrado para ese evento ───────────
    ue_result = await db.execute(
        select(UsuarioEvento).where(
            UsuarioEvento.id_matricula == matricula,
            UsuarioEvento.id_evento == evento.id_evento,
        )
    )
    if not ue_result.scalar_one_or_none():
        await _log(db, "INSCRIPCION_RECHAZADA", id_matricula=matricula, ip_origen=ip_origen,
                   detalle=f"Alumno no registrado para evento {evento.id_evento}")
        await db.commit()
        raise ValidacionError("El alumno no está registrado para este evento", 403)

    # ── 4. Verificar que no esté ya inscrito en ese evento ───────────────────
    ins_result = await db.execute(
        select(Inscripcion).where(
            Inscripcion.id_matricula == matricula,
            Inscripcion.id_evento == evento.id_evento,
        )
    )
    if ins_result.scalar_one_or_none():
        await _log(db, "YA_INSCRITO", id_matricula=matricula, ip_origen=ip_origen,
                   detalle=f"Ya inscrito en evento {evento.id_evento}")
        await db.commit()
        raise ValidacionError("El alumno ya está inscrito en un proyecto de este evento", 403)

    # ── 5. Transacción: SELECT FOR UPDATE + acción ───────────────────────────
    # SELECT FOR UPDATE bloquea la fila del proyecto para evitar race conditions
    # (dos empresas escaneando al mismo alumno al mismo tiempo)
    locked_result = await db.execute(
        select(Proyecto)
        .where(Proyecto.id_proyecto == id_proyecto)
        .with_for_update()
    )
    proyecto_locked = locked_result.scalar_one()

    hay_cupo = proyecto_locked.cupo_actual < proyecto_locked.capacidad_max

    if hay_cupo:
        # ── 6a. Inscribir ────────────────────────────────────────────────────
        db.add(Inscripcion(
            id_matricula=matricula,
            id_proyecto=id_proyecto,
            id_evento=evento.id_evento,
        ))
        proyecto_locked.cupo_actual += 1

        # Eliminar al alumno de TODAS las listas de espera de este evento
        await db.execute(
            delete(ListaEspera).where(
                ListaEspera.id_matricula == matricula,
                ListaEspera.id_evento == evento.id_evento,
            )
        )

        await _log(db, "INSCRIPCION_OK", id_matricula=matricula, ip_origen=ip_origen,
                   id_proyecto=id_proyecto,
                   detalle=f"Inscrito en {proyecto.nombre_proyecto} / {empresa.nombre_empresa}")
        await db.commit()

        return {
            "status": "inscrito",
            "message": "Inscripción exitosa",
            "alumno": usuario.nombre,
            "matricula": matricula,
            "proyecto": proyecto.nombre_proyecto,
            "empresa": empresa.nombre_empresa,
            "evento": evento.nombre,
            "posicion": None,
        }

    else:
        # ── 6b / 6c. Sin cupo ────────────────────────────────────────────────
        hay_lista = proyecto_locked.capacidad_espera_max > 0

        if not hay_lista:
            await _log(db, "CUPO_LLENO", id_matricula=matricula, ip_origen=ip_origen,
                       id_proyecto=id_proyecto, detalle="Sin lista de espera")
            await db.commit()
            raise ValidacionError("Proyecto lleno y sin lista de espera disponible", 409)

        # Verificar si ya está en lista de espera de este proyecto
        espera_result = await db.execute(
            select(ListaEspera).where(
                ListaEspera.id_matricula == matricula,
                ListaEspera.id_proyecto == id_proyecto,
            )
        )
        if espera_result.scalar_one_or_none():
            raise ValidacionError("Ya estás en la lista de espera de este proyecto", 409)

        # Verificar que la lista de espera no esté llena
        count_result = await db.execute(
            select(func.count()).where(ListaEspera.id_proyecto == id_proyecto)
        )
        en_espera = count_result.scalar() or 0

        if en_espera >= proyecto_locked.capacidad_espera_max:
            await _log(db, "CUPO_LLENO", id_matricula=matricula, ip_origen=ip_origen,
                       id_proyecto=id_proyecto, detalle="Lista de espera llena")
            await db.commit()
            raise ValidacionError("Proyecto lleno y lista de espera también llena", 409)

        db.add(ListaEspera(
            id_matricula=matricula,
            id_proyecto=id_proyecto,
            id_evento=evento.id_evento,
        ))

        await _log(db, "LISTA_ESPERA", id_matricula=matricula, ip_origen=ip_origen,
                   id_proyecto=id_proyecto,
                   detalle=f"Posición {en_espera + 1} en lista de {proyecto.nombre_proyecto}")
        await db.commit()

        return {
            "status": "lista_espera",
            "message": "Proyecto lleno. Alumno agregado a lista de espera",
            "alumno": usuario.nombre,
            "matricula": matricula,
            "proyecto": proyecto.nombre_proyecto,
            "empresa": empresa.nombre_empresa,
            "evento": evento.nombre,
            "posicion": en_espera + 1,
        }
