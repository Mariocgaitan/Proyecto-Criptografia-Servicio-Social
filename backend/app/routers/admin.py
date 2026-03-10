"""
Router del módulo Admin — Panel de control para ServicioSocialMaster.

Endpoints:
  GET  /admin/login        → Página de login del administrador
  GET  /admin/dashboard    → Panel principal (protegido)
  GET  /api/v1/admin/proyectos          → Listar proyectos del evento activo
  POST /api/v1/admin/proyectos          → Crear nuevo proyecto
  PATCH /api/v1/admin/proyectos/{id}/capacidad → Ampliar cupo
"""
from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_admin
from app.db.session import get_db
from app.services import admin_service
router = APIRouter()


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
