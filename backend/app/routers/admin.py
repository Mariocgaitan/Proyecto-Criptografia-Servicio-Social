"""
Router del módulo Admin — Panel de control para ServicioSocialMaster.

Endpoints:
  GET  /admin/login        → Página de login del administrador
  GET  /admin/dashboard    → Panel principal (protegido)
  GET  /api/v1/admin/proyectos          → Listar proyectos del evento activo
  POST /api/v1/admin/proyectos          → Crear nuevo proyecto
  PATCH /api/v1/admin/proyectos/{id}/capacidad → Ampliar cupo
  GET  /api/v1/admin/usuarios-empresa   → Listar usuarios de tipo empresa
  POST /api/v1/admin/usuarios-empresa/{id_matricula}/reset-password → Resetear contraseña de empresa
  POST /api/v1/admin/upload-csv         → Cargar CSV de empresas y proyectos
"""

from datetime import datetime

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Query,
    Request,
    UploadFile,
    status,
)
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_admin
from app.core.limiter import limiter
from app.db.session import get_db
from app.services import admin_service
from app.services.email_service import enviar_correo_baja, enviar_correo_inscripcion

router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────────────────────


class ProyectoCreate(BaseModel):
    id_empresa: int
    id_evento: int
    nombre_proyecto: str
    descripcion: str | None = None
    capacidad_max: int


class CapacidadUpdate(BaseModel):
    nueva_capacidad_max: int


class InscripcionCreate(BaseModel):
    id_matricula: str
    id_proyecto: int


class EventoCreate(BaseModel):
    nombre: str
    periodo: str  # INVIERNO | FEB_JUN | VERANO | AGO_DIC
    anio: int
    fecha_inicio: datetime | None = None
    fecha_fin: datetime | None = None


# ── API Endpoints ──────────────────────────────────────────────────────────────


@router.get("/api/v1/admin/proyectos", tags=["Admin"])
async def api_listar_proyectos(
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
):
    """Lista los proyectos del evento activo con stats de cupo."""
    return await admin_service.listar_proyectos(db, page=page, page_size=page_size)


@router.post(
    "/api/v1/admin/proyectos", status_code=status.HTTP_201_CREATED, tags=["Admin"]
)
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
    """Amplía la capacidad de un proyecto."""
    return await admin_service.ampliar_cupo(db, id_proyecto, datos.nueva_capacidad_max)


@router.delete("/api/v1/admin/inscripciones/{id_inscripcion}", tags=["Admin"])
async def api_eliminar_inscripcion(
    id_inscripcion: str,
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    """Elimina una inscripción de alumno y ajusta cupo del proyecto."""
    resultado = await admin_service.eliminar_inscripcion(
        db,
        id_inscripcion,
        actor_matricula=current_admin.id_matricula,
        ip_origen=request.client.host if request.client else None,
    )
    if resultado.get("ok") and resultado.get("correo_alumno"):
        background_tasks.add_task(
            enviar_correo_baja,
            to_email=resultado["correo_alumno"],
            nombre_alumno=resultado["nombre_alumno"],
            nombre_proyecto=resultado["nombre_proyecto"],
            nombre_empresa=resultado["nombre_empresa"],
        )
    return resultado


@router.post(
    "/api/v1/admin/inscripciones", status_code=status.HTTP_201_CREATED, tags=["Admin"]
)
async def api_crear_inscripcion(
    datos: InscripcionCreate,
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    """Crea una nueva inscripción de alumno en un proyecto."""
    resultado = await admin_service.crear_inscripcion(
        db,
        datos.id_matricula,
        datos.id_proyecto,
        actor_matricula=current_admin.id_matricula,
        ip_origen=request.client.host if request.client else None,
    )
    if resultado.get("ok") and resultado.get("correo_alumno"):
        background_tasks.add_task(
            enviar_correo_inscripcion,
            to_email=resultado["correo_alumno"],
            nombre_alumno=resultado["nombre_alumno"],
            nombre_proyecto=resultado["nombre_proyecto"],
            nombre_empresa=resultado["nombre_empresa"],
        )
    return resultado


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


@router.post(
    "/api/v1/admin/eventos", status_code=status.HTTP_201_CREATED, tags=["Admin"]
)
async def api_crear_evento(
    datos: EventoCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    """Crea un nuevo periodo y lo activa (desactiva el anterior)."""
    return await admin_service.crear_evento(db, datos)


@router.get("/api/v1/admin/usuarios-empresa", tags=["Admin"])
async def api_listar_usuarios_empresa(
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    """Lista todos los usuarios de tipo empresa con sus correos y empresas vinculadas."""
    return await admin_service.listar_usuarios_empresa(db)


@router.post(
    "/api/v1/admin/usuarios-empresa/{id_matricula}/reset-password", tags=["Admin"]
)
async def api_resetear_password_empresa(
    id_matricula: str,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    """
    Resetea la contraseña de un usuario empresa y retorna la nueva contraseña.
    ⚠️ La contraseña se retorna EN TEXTO PLANO - solo usar cuando el admin lo necesite.
    """
    return await admin_service.resetear_password_empresa(db, id_matricula)


@router.post("/api/v1/admin/upload-csv", tags=["Admin"])
async def api_upload_csv(
    file: UploadFile = File(...),
    id_evento: int = Query(
        ..., description="ID del evento al que se asignarán los proyectos"
    ),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    """
    Carga un CSV con empresas y proyectos.

    Formato esperado (CSV con headers):
    nombre_empresa,logo_url,nombre_proyecto,descripcion_proyecto,capacidad_max

    Ejemplo:
    Cemex,https://logo.url,Proyecto A,Descripción del proyecto,50
    Femsa,,Proyecto B,Otra descripción,30

    - Crea empresas si no existen
    - Siempre crea nuevos proyectos en el evento especificado
    """
    from fastapi import HTTPException

    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="El archivo debe ser un CSV")

    content = await file.read()
    try:
        csv_text = content.decode("utf-8")
    except UnicodeDecodeError:
        try:
            csv_text = content.decode("latin-1")
        except UnicodeDecodeError:
            raise HTTPException(
                status_code=400,
                detail="No se pudo decodificar el archivo. Usa codificación UTF-8 o Latin-1",
            )

    return await admin_service.procesar_csv_empresas_proyectos(db, csv_text, id_evento)


# ── Credenciales ───────────────────────────────────────────────────────────────


@router.get("/api/v1/admin/credenciales", tags=["Admin"])
async def api_listar_credenciales(
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    """Lista usuarios admin/empresa para el panel de credenciales."""
    return await admin_service.listar_credenciales(db)


@router.post(
    "/api/v1/admin/credenciales/{id_matricula}/reset-password",
    tags=["Admin"],
)
@limiter.limit("10/minute")
async def api_reset_password(
    id_matricula: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    """
    Genera una contraseña nueva para el usuario indicado y la devuelve UNA SOLA VEZ.
    Revoca todos los refresh tokens del usuario para forzar re-login.
    """
    return await admin_service.reset_password_usuario(
        db,
        id_matricula=id_matricula,
        actor_matricula=current_admin.id_matricula,
        ip_origen=request.client.host if request.client else None,
    )
