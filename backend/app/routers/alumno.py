"""
Router del módulo Alumno.

Rutas SSR:
  GET  /dashboard              → Dashboard principal del alumno

Rutas API JSON (protegidas por JWT en header Authorization):
  GET  /api/v1/alumno/qr-payload          → Payload TOTP para el QR de un evento
  GET  /api/v1/alumno/estado-inscripcion  → Estado de inscripción en todos los eventos
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user, get_current_user_optional
from app.db.session import get_db
from app.services.alumno_service import (
    AlumnoError,
    generar_qr_payload,
    obtener_datos_dashboard,
    obtener_estado_inscripcion,
)

router = APIRouter()
templates = Jinja2Templates(directory="app/templates")


# ═══════════════════════════════════════════════════════════════════════════════
#  SSR — Dashboard
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/dashboard", response_class=HTMLResponse, name="alumno_dashboard", include_in_schema=False)
async def dashboard(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: dict | None = Depends(get_current_user_optional),
):
    """
    Dashboard principal del alumno.
    - Lee el JWT desde la cookie 'access_token' (establacida al hacer login).
    - Si no hay token válido, redirige al login.
    - Renderiza una sección de QR por cada evento registrado del alumno.
    """
    if not current_user:
        return RedirectResponse(url="/login", status_code=303)

    try:
        datos = await obtener_datos_dashboard(db, current_user["sub"])
    except AlumnoError:
        return RedirectResponse(url="/login", status_code=303)

    return templates.TemplateResponse(
        "alumno/dashboard.html",
        {"request": request, "usuario": datos},
    )


# ═══════════════════════════════════════════════════════════════════════════════
#  API JSON
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/api/v1/alumno/qr-payload", tags=["Alumno"], summary="Obtener payload QR del evento")
async def qr_payload(
    id_evento: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
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
        return await generar_qr_payload(db, current_user["sub"], id_evento)
    except AlumnoError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.get("/api/v1/alumno/estado-inscripcion", tags=["Alumno"], summary="Estado de inscripción en todos los eventos")
async def estado_inscripcion(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Consulta el estado de inscripción del alumno en todos sus eventos registrados.
    """
    return await obtener_estado_inscripcion(db, current_user["sub"])
