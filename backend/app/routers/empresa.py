"""
Router del módulo Empresa — login y escáner QR para representantes de empresa.
"""
from fastapi import APIRouter, Depends, Form, HTTPException, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.services.auth_service import LoginError, login_alumno
from app.services.empresa_service import EscanerError, obtener_info_proyecto, validar_y_inscribir

router = APIRouter()
templates = Jinja2Templates(directory="app/templates")

REFRESH_COOKIE_MAX_AGE = 8 * 60 * 60  # 8 horas


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_empresa_user(request: Request, db: AsyncSession):
    """Extrae y valida el usuario empresa del access_token en cookie."""
    from sqlalchemy import select
    import jwt
    from app.core.config import settings
    from app.models.usuario import Usuario

    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="No autenticado")
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

    matricula = payload.get("sub")
    result = await db.execute(select(Usuario).where(Usuario.id_matricula == matricula))
    user = result.scalar_one_or_none()
    if not user or user.rol != "empresa":
        raise HTTPException(status_code=403, detail="Acceso solo para representantes de empresa")
    return user


# ── Login HTML ────────────────────────────────────────────────────────────────

@router.get("/empresa/login", response_class=HTMLResponse, include_in_schema=False)
async def empresa_login_get(request: Request):
    return templates.TemplateResponse(
        "empresa/login.html",
        {"request": request, "error": None},
    )


@router.post("/empresa/login", response_class=HTMLResponse, include_in_schema=False)
async def empresa_login_post(
    request: Request,
    db: AsyncSession = Depends(get_db),
    correo: str = Form(...),
    password: str = Form(...),
):
    """Procesa el login del representante de empresa. Solo acepta rol='empresa'."""
    from sqlalchemy import select
    from app.models.usuario import Usuario

    ip = request.client.host if request.client else None
    try:
        access_token, raw_refresh = await login_alumno(db, correo, password, ip)
    except LoginError as e:
        return templates.TemplateResponse(
            "empresa/login.html",
            {"request": request, "error": e.message, "correo": correo},
            status_code=401,
        )

    result = await db.execute(select(Usuario).where(Usuario.correo == correo))
    user = result.scalar_one_or_none()
    if not user or user.rol != "empresa":
        return templates.TemplateResponse(
            "empresa/login.html",
            {"request": request, "error": "Acceso denegado: solo para representantes de empresa.", "correo": correo},
            status_code=403,
        )

    response = RedirectResponse(url="/empresa/escaner", status_code=303)
    response.set_cookie(key="refresh_token", value=raw_refresh, httponly=True,
                        secure=False, samesite="strict", max_age=REFRESH_COOKIE_MAX_AGE)
    response.set_cookie(key="access_token", value=access_token, httponly=False,
                        secure=False, samesite="strict", max_age=15 * 60)
    return response


# ── Escáner HTML ──────────────────────────────────────────────────────────────

@router.get("/empresa/escaner", response_class=HTMLResponse, include_in_schema=False)
async def empresa_escaner(request: Request, db: AsyncSession = Depends(get_db)):
    try:
        user = await _get_empresa_user(request, db)
    except HTTPException:
        return RedirectResponse(url="/empresa/login", status_code=303)

    if not user.id_proyecto:
        return templates.TemplateResponse(
            "empresa/login.html",
            {"request": request, "error": "Tu cuenta no tiene un proyecto asignado. Contacta al administrador."},
        )

    try:
        proyecto = await obtener_info_proyecto(db, user.id_proyecto)
    except EscanerError as e:
        return templates.TemplateResponse(
            "empresa/login.html",
            {"request": request, "error": e.message},
        )

    return templates.TemplateResponse(
        "empresa/escaner.html",
        {"request": request, "usuario": user, "proyecto": proyecto},
    )


# ── API: Validar QR ───────────────────────────────────────────────────────────

class QRScan(BaseModel):
    qr_data: str  # El JSON crudo del QR escaneado


@router.post("/api/v1/empresa/escanear", tags=["Empresa"])
async def api_escanear_qr(
    request: Request,
    payload: QRScan,
    db: AsyncSession = Depends(get_db),
):
    """
    Valida y procesa un QR escaneado.
    El usuario empresa solo puede inscribir alumnos en su propio proyecto.
    """
    user = await _get_empresa_user(request, db)

    if not user.id_proyecto:
        raise HTTPException(status_code=400, detail="Sin proyecto asignado")

    try:
        resultado = await validar_y_inscribir(db, user.id_proyecto, payload.qr_data)
    except EscanerError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)

    return resultado


# ── API: Info proyecto ────────────────────────────────────────────────────────

@router.get("/api/v1/empresa/proyecto", tags=["Empresa"])
async def api_info_proyecto(request: Request, db: AsyncSession = Depends(get_db)):
    """Devuelve la información del proyecto asignado al representante logueado."""
    user = await _get_empresa_user(request, db)
    if not user.id_proyecto:
        raise HTTPException(status_code=400, detail="Sin proyecto asignado")
    try:
        return await obtener_info_proyecto(db, user.id_proyecto)
    except EscanerError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
