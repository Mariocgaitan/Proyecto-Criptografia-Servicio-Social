"""
Router del módulo Alumno.

Rutas SSR:
  GET  /dashboard              → Dashboard principal del alumno

Rutas API JSON (protegidas por JWT en header Authorization):
  GET  /api/v1/alumno/qr-payload          → Payload TOTP para el QR de un evento
  GET  /api/v1/alumno/estado-inscripcion  → Estado de inscripción en todos los eventos
"""
from fastapi import APIRouter, Depends, HTTPException

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.services.alumno_service import (
    AlumnoError,
    generar_qr_payload,
    obtener_datos_dashboard,
    obtener_estado_inscripcion,
)

router = APIRouter()


# ═══════════════════════════════════════════════════════════════════════════════
#  API JSON
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/api/v1/alumno/dashboard", tags=["Alumno"], summary="Obtener datos del dashboard del alumno")
async def api_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: "Usuario" = Depends(get_current_user),
):
    """
    Retorna la información completa del dashboard del alumno:
    datos de usuario, eventos registrados, estado de inscripción y catálogo de proyectos.
    """
    try:
        return await obtener_datos_dashboard(db, current_user.id_matricula)
    except AlumnoError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)



@router.get("/api/v1/alumno/qr-payload", tags=["Alumno"], summary="Obtener payload QR del evento")
async def qr_payload(
    id_evento: int,
    db: AsyncSession = Depends(get_db),
    current_user: "Usuario" = Depends(get_current_user),
):
    """
    Genera el payload actual del QR para el evento indicado.
    Llamado por JS cada 30 segundos por cada evento del alumno.

    Query param: id_evento (int, requerido)

    Returns:
        qr_data: string JSON serializado para renderizar con qrcode.js
        expira_en_segundos: segundos que faltan para el próximo ciclo TOTP
        ya_inscrito: True si el alumno ya tiene inscripción confirmada en ese evento
    """
    try:
        return await generar_qr_payload(db, current_user.id_matricula, id_evento)
    except AlumnoError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.get("/api/v1/alumno/estado-inscripcion", tags=["Alumno"], summary="Estado de inscripción en todos los eventos")
async def estado_inscripcion(
    db: AsyncSession = Depends(get_db),
    current_user: "Usuario" = Depends(get_current_user),
):
    """
    Consulta el estado de inscripción del alumno en todos sus eventos registrados.
    """
    return await obtener_estado_inscripcion(db, current_user.id_matricula)
