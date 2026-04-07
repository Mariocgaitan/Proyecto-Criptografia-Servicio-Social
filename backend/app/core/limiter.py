from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings

# Use Redis for rate limit storage when available, fallback to memory
_storage_uri = settings.REDIS_URL if settings.REDIS_URL else None

limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=_storage_uri,
)
