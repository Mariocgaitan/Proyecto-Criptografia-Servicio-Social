from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_admin
from app.db.session import get_db
from app.services import estadisticas_service

router = APIRouter()


@router.get("/api/v1/admin/estadisticas/kpis", tags=["Admin", "Estadisticas"])
async def api_kpis(
    evento_id: int | None = None,
    fecha_inicio: date | None = None,
    fecha_fin: date | None = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    return await estadisticas_service.get_kpis(db, evento_id, fecha_inicio, fecha_fin)


@router.get("/api/v1/admin/estadisticas/ocupacion-eventos", tags=["Admin", "Estadisticas"])
async def api_ocupacion_eventos(
    evento_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    return await estadisticas_service.get_ocupacion_eventos(db, evento_id)


@router.get("/api/v1/admin/estadisticas/proyectos-cupo", tags=["Admin", "Estadisticas"])
async def api_proyectos_cupo(
    evento_id: int | None = None,
    empresa_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    return await estadisticas_service.get_proyectos_cupo(db, evento_id, empresa_id)


@router.get("/api/v1/admin/estadisticas/alumnos-por-empresa", tags=["Admin", "Estadisticas"])
async def api_alumnos_por_empresa(
    evento_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    return await estadisticas_service.get_alumnos_por_empresa(db, evento_id)


@router.get("/api/v1/admin/estadisticas/alumnos-por-carrera", tags=["Admin", "Estadisticas"])
async def api_alumnos_por_carrera(
    evento_id: int | None = None,
    carrera: str | None = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    return await estadisticas_service.get_alumnos_por_carrera(db, evento_id, carrera)


@router.get("/api/v1/admin/estadisticas/tendencia-espera", tags=["Admin", "Estadisticas"])
async def api_tendencia_espera(
    evento_id: int | None = None,
    dias: int = Query(default=13, ge=3, le=60),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    return await estadisticas_service.get_tendencia_espera(db, evento_id, dias)


@router.get("/api/v1/admin/estadisticas/inscripciones-timeline", tags=["Admin", "Estadisticas"])
async def api_inscripciones_timeline(
    evento_id: int | None = None,
    empresa_id: int | None = None,
    proyecto_id: int | None = None,
    carrera: str | None = None,
    fecha_inicio: date | None = None,
    fecha_fin: date | None = None,
    horas: int | None = Query(default=None, ge=1, le=720),
    ventana: str = Query(default="24h"),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    return await estadisticas_service.get_inscripciones_timeline(
        db,
        evento_id=evento_id,
        empresa_id=empresa_id,
        proyecto_id=proyecto_id,
        carrera=carrera,
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin,
        horas=horas,
        ventana=ventana,
    )


@router.get("/api/v1/admin/estadisticas/reinscripcion-scatter", tags=["Admin", "Estadisticas"])
async def api_reinscripcion_scatter(
    evento_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    return await estadisticas_service.get_reinscripcion_scatter(db, evento_id)


@router.get("/api/v1/admin/estadisticas/comparativa-eventos", tags=["Admin", "Estadisticas"])
async def api_comparativa_eventos(
    evento_actual_id: int | None = None,
    evento_anterior_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    return await estadisticas_service.get_comparativa_eventos(db, evento_actual_id, evento_anterior_id)


@router.get("/api/v1/admin/estadisticas/ratio-inscritos", tags=["Admin", "Estadisticas"])
async def api_ratio_inscritos(
    evento_id: int | None = None,
    empresa_id: int | None = None,
    carrera: str | None = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    return await estadisticas_service.get_ratio_inscritos(db, evento_id, empresa_id, carrera)


@router.get("/api/v1/admin/estadisticas/logs-recientes", tags=["Admin", "Estadisticas"])
async def api_logs_recientes(
    limite: int = Query(default=10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    return await estadisticas_service.get_logs_recientes(db, limite)


@router.get("/api/v1/admin/estadisticas/general", tags=["Admin", "Estadisticas"])
async def api_estadisticas_general(
    evento_id: int | None = None,
    carrera: str | None = None,
    fecha_inicio: date | None = None,
    fecha_fin: date | None = None,
    timeline_ventana: str = Query(default="24h"),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    return await estadisticas_service.get_general_contract(
        db,
        evento_id=evento_id,
        carrera=carrera,
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin,
        timeline_ventana=timeline_ventana,
    )


@router.get("/api/v1/admin/estadisticas/particular", tags=["Admin", "Estadisticas"])
async def api_estadisticas_particular(
    evento_id: int | None = None,
    empresa_id: int | None = None,
    proyecto_id: int | None = None,
    carrera: str | None = None,
    fecha_inicio: date | None = None,
    fecha_fin: date | None = None,
    timeline_ventana: str = Query(default="24h"),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    return await estadisticas_service.get_particular_contract(
        db,
        evento_id=evento_id,
        empresa_id=empresa_id,
        proyecto_id=proyecto_id,
        carrera=carrera,
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin,
        timeline_ventana=timeline_ventana,
    )
