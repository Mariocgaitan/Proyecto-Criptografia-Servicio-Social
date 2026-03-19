"""
Router del módulo Admin — Panel de control para ServicioSocialMaster.

Endpoints:
  GET  /admin/login        → Página de login del administrador
  GET  /admin/dashboard    → Panel principal (protegido)
  GET  /api/v1/admin/proyectos          → Listar proyectos del evento activo
  POST /api/v1/admin/proyectos          → Crear nuevo proyecto
  PATCH /api/v1/admin/proyectos/{id}/capacidad → Ampliar cupo
"""
from fastapi import APIRouter, Depends, Request, status
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


class InscripcionCreate(BaseModel):
    id_matricula: str
    id_proyecto: int


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


@router.delete("/api/v1/admin/inscripciones/{id_inscripcion}", tags=["Admin"])
async def api_eliminar_inscripcion(
    id_inscripcion: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    """Elimina una inscripción de alumno y ajusta cupo del proyecto."""
    return await admin_service.eliminar_inscripcion(
        db,
        id_inscripcion,
        actor_matricula=current_admin.id_matricula,
        ip_origen=request.client.host if request.client else None,
    )


@router.post("/api/v1/admin/inscripciones", status_code=status.HTTP_201_CREATED, tags=["Admin"])
async def api_crear_inscripcion(
    datos: InscripcionCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    """Crea una nueva inscripción de alumno en un proyecto."""
    return await admin_service.crear_inscripcion(
        db,
        datos.id_matricula,
        datos.id_proyecto,
        actor_matricula=current_admin.id_matricula,
        ip_origen=request.client.host if request.client else None,
    )


@router.get("/api/v1/admin/alumnos-disponibles", tags=["Admin"])
async def api_alumnos_disponibles(
    id_evento: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    """Retorna alumnos registrados en un evento que no están inscritos en ningún proyecto."""
    return await admin_service.listar_alumnos_disponibles(db, id_evento)



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
