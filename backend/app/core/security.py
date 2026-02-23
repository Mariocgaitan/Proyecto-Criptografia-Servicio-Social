import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.core.config import settings


# ── Contraseñas ───────────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    """Hashea una contraseña con bcrypt."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica una contraseña contra su hash bcrypt."""
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


# ── JWT Access Token ──────────────────────────────────────────────────────────

def create_access_token(data: dict) -> str:
    """
    Genera un JWT firmado con JWT_SECRET_KEY.
    `data` debe incluir 'sub' (matrícula) y 'rol'.
    """
    payload = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload.update({"exp": expire, "iat": datetime.now(timezone.utc)})
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """
    Decodifica y valida un JWT.
    Lanza jwt.ExpiredSignatureError o jwt.InvalidTokenError si es inválido.
    """
    return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])


# ── Refresh Token ─────────────────────────────────────────────────────────────

def generate_refresh_token() -> str:
    """Genera un refresh token aleatorio seguro (URL-safe, 32 bytes = 43 chars)."""
    return secrets.token_urlsafe(32)


def hash_refresh_token(raw_token: str) -> str:
    """Hashea un refresh token con SHA-256 para guardarlo en DB."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


# ── Dependency de FastAPI ─────────────────────────────────────────────────────

async def get_current_user(request: "Request") -> dict:
    """
    Dependency que extrae y valida el JWT del header Authorization.
    Retorna el payload del token {'sub': matricula, 'rol': 'alumno'}.
    Lanza HTTPException 401 si el token es inválido o falta.
    """
    from fastapi import HTTPException, Request
    from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token de autenticación requerido")

    token = auth_header.split(" ", 1)[1]
    try:
        payload = decode_access_token(token)
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")
