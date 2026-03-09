"""
Router del módulo Admin — Panel de control para ServicioSocialMaster.

Endpoints:
  GET  /admin/login        → Página de login del administrador
  GET  /admin/dashboard    → Panel principal (protegido)
  GET  /api/v1/admin/proyectos          → Listar proyectos del evento activo
  POST /api/v1/admin/proyectos          → Crear nuevo proyecto
  PATCH /api/v1/admin/proyectos/{id}/capacidad → Ampliar cupo
"""
from fastapi import APIRouter, Depends, Form, HTTPException, Request, status
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_admin
from app.db.session import get_db
from app.services import admin_service
from app.services.auth_service import LoginError, login_alumno

router = APIRouter()
templates = Jinja2Templates(directory="app/templates")

REFRESH_COOKIE_MAX_AGE = 8 * 60 * 60  # 8 horas


# ── Login Admin ────────────────────────────────────────────────────────────────

@router.post("/admin/login", include_in_schema=False)
async def admin_login_submit(
    request: Request,
    db: AsyncSession = Depends(get_db),
    correo: str = Form(...),
    password: str = Form(...),
):
    """Procesa el login del administrador. Verifica rol='admin' antes de continuar."""
    ip = request.client.host if request.client else None
    try:
        access_token, raw_refresh = await login_alumno(db, correo, password, ip)
    except LoginError as e:
        return templates.TemplateResponse(
            "admin/login.html",
            {"request": request, "error": e.message, "correo": correo},
            status_code=401,
        )

    # Verificar que el usuario tiene rol admin
    from sqlalchemy import select
    from app.models.usuario import Usuario
    result = await db.execute(select(Usuario).where(Usuario.correo == correo))
    user = result.scalar_one_or_none()
    if not user or user.rol != "admin":
        return templates.TemplateResponse(
            "admin/login.html",
            {"request": request, "error": "Acceso denegado: esta área es solo para administradores.", "correo": correo},
            status_code=403,
        )

    response = RedirectResponse(url="/admin/dashboard", status_code=303)
    response.set_cookie(key="refresh_token", value=raw_refresh, httponly=True,
                        secure=False, samesite="strict", max_age=REFRESH_COOKIE_MAX_AGE)
    response.set_cookie(key="access_token", value=access_token, httponly=False,
                        secure=False, samesite="strict", max_age=15 * 60)
    return response


# ── Schemas ────────────────────────────────────────────────────────────────────

class ProyectoCreate(BaseModel):
    id_empresa: int
    id_evento: int
    nombre_proyecto: str
    descripcion: str | None = None
    capacidad_max: int
    capacidad_espera_max: int = 0


class CapacidadUpdate(BaseModel):
    nueva_capacidad_max: int


# ── HTML Endpoints ─────────────────────────────────────────────────────────────

@router.get("/admin/login", response_class=HTMLResponse, include_in_schema=False)
async def admin_login_page(request: Request):
    """Página de login del administrador."""
    return templates.TemplateResponse(
        "admin/login.html",
        {"request": request}
    )


@router.get("/admin/dashboard", response_class=HTMLResponse, include_in_schema=False)
async def admin_dashboard_page(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Panel de control del administrador. Redirige a login si no está autenticado."""
    from fastapi import HTTPException as _HTTP
    try:
        current_user = await get_current_admin(request, db)
    except _HTTP:
        return RedirectResponse(url="/admin/login", status_code=303)

    proyectos = await admin_service.listar_proyectos(db)
    empresas = await admin_service.listar_empresas(db)
    eventos = await admin_service.listar_eventos(db)
    return templates.TemplateResponse(
        "admin/dashboard.html",
        {
            "request": request,
            "usuario": current_user,
            "proyectos": proyectos,
            "empresas": empresas,
            "eventos": eventos,
        }
    )


# ── API Endpoints ──────────────────────────────────────────────────────────────

@router.get("/api/v1/admin/proyectos", tags=["Admin"])
async def api_listar_proyectos(
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    """Lista los proyectos del evento activo con stats de cupo."""
    return await admin_service.listar_proyectos(db)


@router.post("/api/v1/admin/proyectos", status_code=status.HTTP_201_CREATED, tags=["Admin"])
async def api_crear_proyecto(
    datos: ProyectoCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    """Crea un nuevo proyecto en el evento especificado."""
    return await admin_service.crear_proyecto(db, datos)


@router.patch("/api/v1/admin/proyectos/{id_proyecto}/capacidad", tags=["Admin"])
async def api_ampliar_cupo(
    id_proyecto: int,
    datos: CapacidadUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    """Amplía la capacidad de un proyecto y promueve alumnos de lista de espera."""
    return await admin_service.ampliar_cupo(db, id_proyecto, datos.nueva_capacidad_max)


@router.post("/api/v1/admin/proyectos/{id_proyecto}/credenciales", tags=["Admin"])
async def api_generar_credenciales(
    id_proyecto: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    """Genera o regenera credenciales de acceso para el representante de empresa del proyecto."""
    return await admin_service.generar_credenciales_para_proyecto(db, id_proyecto)



@router.get("/api/v1/admin/empresas", tags=["Admin"])
async def api_listar_empresas(
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    return await admin_service.listar_empresas(db)


@router.get("/api/v1/admin/eventos", tags=["Admin"])
async def api_listar_eventos(
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    return await admin_service.listar_eventos(db)
