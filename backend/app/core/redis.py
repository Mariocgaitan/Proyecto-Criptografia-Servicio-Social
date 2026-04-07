"""
Async Redis client — connection pool, health check, graceful shutdown.
"""
import redis.asyncio as aioredis
import structlog

from app.core.config import settings

logger = structlog.get_logger(__name__)

_redis: aioredis.Redis | None = None


async def connect_redis() -> None:
    """Initialize the Redis connection pool."""
    global _redis
    try:
        _redis = aioredis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=5,
        )
        await _redis.ping()
        logger.info("redis_connected", url=settings.REDIS_URL.split("@")[-1])
    except Exception:
        logger.warning("redis_unavailable", url=settings.REDIS_URL.split("@")[-1])
        _redis = None


async def disconnect_redis() -> None:
    """Close the Redis connection pool."""
    global _redis
    if _redis is not None:
        await _redis.aclose()
        _redis = None
        logger.info("redis_disconnected")


def get_redis() -> aioredis.Redis | None:
    """Return the current Redis client, or None if unavailable."""
    return _redis


async def redis_health() -> bool:
    """Check if Redis is reachable."""
    if _redis is None:
        return False
    try:
        return await _redis.ping()
    except Exception:
        return False
