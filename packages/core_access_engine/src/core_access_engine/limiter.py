"""
Rate limiting — fábrica de limitador SlowAPI con backend Redis o memoria.

Provee una función de fábrica `build_limiter` en lugar de un singleton
global, para que cada app consumidora cree su propia instancia con su
propia URL de Redis y sus propios límites.

Uso:
    from core_access_engine.limiter import build_limiter

    limiter = build_limiter(redis_url=settings.REDIS_URL)

    # Luego en FastAPI:
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_handler)

    # En un router:
    @router.post("/login")
    @limiter.limit("10/minute")
    async def login(request: Request, ...): ...

Si `redis_url` es None, el limitador usa memoria en proceso (seguro en
dev pero no persistente entre workers en producción).
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

__all__ = ["build_limiter"]


def build_limiter(redis_url: str | None = None) -> Limiter:
    """
    Crea e instancia un Limiter de SlowAPI.

    Args:
        redis_url: URL de conexión Redis. Ej: "redis://:password@localhost:6379/0"
                   Si es None, usa almacenamiento en memoria del proceso.

    Returns:
        Instancia de `slowapi.Limiter` lista para registrar en FastAPI.
    """
    return Limiter(
        key_func=get_remote_address,
        storage_uri=redis_url,
    )
