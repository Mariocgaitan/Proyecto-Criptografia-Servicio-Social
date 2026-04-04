"""
Health check endpoint — reports status of DB and Redis.
"""
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.core.redis import redis_health
from app.db.session import AsyncSessionLocal

router = APIRouter(tags=["Health"])

_VERSION = "0.5.0"


@router.get("/health")
async def health_check():
    """Public health check. No auth required."""
    db_ok = await _check_db()
    redis_ok = await redis_health()

    if db_ok and redis_ok:
        status = "ok"
    elif db_ok:
        status = "degraded"
    else:
        status = "down"

    status_code = 200 if status != "down" else 503

    return JSONResponse(
        status_code=status_code,
        content={
            "status": status,
            "version": _VERSION,
            "db": db_ok,
            "redis": redis_ok,
        },
    )


async def _check_db() -> bool:
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
