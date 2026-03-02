"""
Router del módulo Empresa.

Rutas SSR:
  GET  /empresa/escaner/{id_proyecto}    → Vista web del escáner QR

Rutas API JSON:
  POST /api/v1/inscripciones/validar     → Valida QR e inscribe al alumno (transaccional)
  GET  /api/v1/empresa/proyecto/{id}     → Datos del proyecto (cupo, empresa, evento)
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.services.empresa_service import (
    ValidacionError,
    obtener_datos_proyecto,
    validar_qr_e_inscribir,
)

router = APIRouter()
templates = Jinja2Templates(directory="app/templates")


# ── Schema de entrada ─────────────────────────────────────────────────────────

class ValidarQRRequest(BaseModel):
    matricula: str
    totp_leido: str
    id_proyecto: int


# ═══════════════════════════════════════════════════════════════════════════════
#  SSR — Vista del escáner
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/empresa/escaner/{id_proyecto}", response_class=HTMLResponse,
            name="empresa_escaner", tags=["Empresa"])
async def vista_escaner(
    id_proyecto: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Vista web del escáner QR para la empresa.
    Activa la cámara con html5-qrcode y manda el resultado al endpoint
    /api/v1/inscripciones/validar via fetch JS.

    No requiere autenticación — el acceso es por link directo
    que el admin le entrega a la empresa el día del evento.
    """
    try:
        datos = await obtener_datos_proyecto(db, id_proyecto)
    except ValidacionError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)

    return templates.TemplateResponse(
        "empresa/escaner.html",
        {"request": request, "proyecto": datos},
    )


# ═══════════════════════════════════════════════════════════════════════════════
#  API JSON
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/api/v1/inscripciones/validar", tags=["Empresa"])
async def validar_inscripcion(
    body: ValidarQRRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Endpoint transaccional crítico.
    Valida el QR del alumno e inscribe (o agrega a lista de espera).

    Request body:
        matricula    — matrícula del alumno (del JSON del QR)
        totp_leido   — código TOTP leído del QR
        id_proyecto  — ID del proyecto donde se está escaneando

    Responses:
        200 → inscrito exitosamente
        202 → agregado a lista de espera
        400 → QR expirado o inválido
        403 → alumno no registrado para el evento / ya inscrito
        409 → proyecto lleno sin lista de espera
    """
    ip = request.client.host if request.client else None

    try:
        resultado = await validar_qr_e_inscribir(
            db,
            matricula=body.matricula,
            totp_leido=body.totp_leido,
            id_proyecto=body.id_proyecto,
            ip_origen=ip,
        )
    except ValidacionError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)

    # 202 si fue a lista de espera, 200 si fue inscripción
    status_code = 202 if resultado["status"] == "lista_espera" else 200
    from fastapi.responses import JSONResponse
    return JSONResponse(content=resultado, status_code=status_code)


@router.get("/api/v1/empresa/proyecto/{id_proyecto}", tags=["Empresa"])
async def datos_proyecto(
    id_proyecto: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Retorna los datos actuales del proyecto (cupo, lista espera, empresa, evento).
    Usado por el JS del escáner para actualizar el marcador de cupo en tiempo real.
    """
    try:
        return await obtener_datos_proyecto(db, id_proyecto)
    except ValidacionError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
