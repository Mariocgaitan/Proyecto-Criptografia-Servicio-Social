"""
Redis cache wrapper with hit/miss counters.

Usage:
    from app.core.cache import cached

    @cached(key="eventos_activos", ttl=300)
    async def get_eventos(db):
        ...

Or manually:
    from app.core.cache import cache_get, cache_set, cache_delete

    data = await cache_get("my_key")
    await cache_set("my_key", data, ttl=300)
    await cache_delete("my_key")
"""
import json
import functools
from typing import Any

import structlog

from app.core.redis import get_redis

logger = structlog.get_logger(__name__)

PREFIX = "sid:"
HITS_KEY = f"{PREFIX}cache:hits"
MISSES_KEY = f"{PREFIX}cache:misses"


async def cache_get(key: str) -> Any | None:
    """Get a value from Redis cache. Returns None on miss or Redis unavailable."""
    redis = get_redis()
    if redis is None:
        return None
    try:
        raw = await redis.get(f"{PREFIX}{key}")
        if raw is not None:
            await redis.incr(HITS_KEY)
            return json.loads(raw)
        await redis.incr(MISSES_KEY)
        return None
    except Exception:
        logger.warning("cache_get_error", key=key)
        return None


async def cache_set(key: str, value: Any, ttl: int = 300) -> None:
    """Set a value in Redis cache with TTL in seconds."""
    redis = get_redis()
    if redis is None:
        return
    try:
        await redis.set(f"{PREFIX}{key}", json.dumps(value, default=str), ex=ttl)
    except Exception:
        logger.warning("cache_set_error", key=key)


async def cache_delete(key: str) -> None:
    """Delete a key from Redis cache."""
    redis = get_redis()
    if redis is None:
        return
    try:
        await redis.delete(f"{PREFIX}{key}")
    except Exception:
        logger.warning("cache_delete_error", key=key)


async def cache_stats() -> dict:
    """Return cache hit/miss statistics."""
    redis = get_redis()
    if redis is None:
        return {"hits": 0, "misses": 0, "ratio": None, "available": False}
    try:
        hits = int(await redis.get(HITS_KEY) or 0)
        misses = int(await redis.get(MISSES_KEY) or 0)
        total = hits + misses
        return {
            "hits": hits,
            "misses": misses,
            "ratio": round(hits / total, 4) if total > 0 else None,
            "available": True,
        }
    except Exception:
        return {"hits": 0, "misses": 0, "ratio": None, "available": False}


def cached(key: str, ttl: int = 300):
    """
    Decorator that caches the return value of an async function in Redis.

    The first argument of the decorated function must be `db` (AsyncSession).
    Additional args are appended to the cache key for uniqueness.

    Usage:
        @cached(key="kpis", ttl=120)
        async def get_kpis(db, evento_id=None):
            ...
    """
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            # Build unique cache key from function args (skip db)
            parts = [key]
            # Add positional args (skip first which is db)
            for arg in args[1:]:
                if arg is not None:
                    parts.append(str(arg))
            # Add keyword args
            for k, v in sorted(kwargs.items()):
                if v is not None:
                    parts.append(f"{k}={v}")
            full_key = ":".join(parts)

            # Try cache
            result = await cache_get(full_key)
            if result is not None:
                return result

            # Miss — call function
            result = await func(*args, **kwargs)
            await cache_set(full_key, result, ttl=ttl)
            return result
        return wrapper
    return decorator
