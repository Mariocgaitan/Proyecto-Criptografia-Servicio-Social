from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import cache_stats
from app.core.dependencies import get_current_admin
from app.db.session import get_db
from app.services import system_metrics_service

router = APIRouter()


@router.get("/api/v1/admin/sistema/requests-por-minuto", tags=["Admin", "Sistema"])
async def api_requests_por_minuto(
    ventana_minutos: int = Query(default=60, ge=15, le=1440),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    return await system_metrics_service.get_requests_per_minute(db, ventana_minutos)


@router.get("/api/v1/admin/sistema/status-distribucion", tags=["Admin", "Sistema"])
async def api_status_distribucion(
    ventana_minutos: int = Query(default=60, ge=15, le=1440),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    return await system_metrics_service.get_status_distribution(db, ventana_minutos)


@router.get("/api/v1/admin/sistema/latencia", tags=["Admin", "Sistema"])
async def api_latencia(
    ventana_minutos: int = Query(default=60, ge=15, le=1440),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    return await system_metrics_service.get_latency_summary(db, ventana_minutos)


@router.get("/api/v1/admin/sistema/logins", tags=["Admin", "Sistema"])
async def api_logins(
    ventana_minutos: int = Query(default=60, ge=15, le=1440),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    return await system_metrics_service.get_login_activity(db, ventana_minutos)


@router.get("/api/v1/admin/sistema/resumen", tags=["Admin", "Sistema"])
async def api_resumen_sistema(
    ventana_minutos: int = Query(default=60, ge=15, le=1440),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    return await system_metrics_service.get_operational_summary(db, ventana_minutos)


@router.get("/api/v1/admin/sistema/cache-stats", tags=["Admin", "Sistema"])
async def api_cache_stats(
    _=Depends(get_current_admin),
):
    """Returns Redis cache hit/miss statistics."""
    return await cache_stats()
