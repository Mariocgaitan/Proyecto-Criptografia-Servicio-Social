import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import HTTPException, Request

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


# ── Pre-Auth Temp Token ────────────────────────────────────────────────────────

def generate_pre_auth_token() -> str:
    """Genera un token temporal para el pre-auth (antes de TOTP). URL-safe, 32 bytes."""
    return secrets.token_urlsafe(32)


def hash_pre_auth_token(raw_token: str) -> str:
    """Hashea un pre-auth token con SHA-256 para guardarlo en DB."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def create_pre_auth_jwt(data: dict) -> str:
    """
    Genera un JWT temporal para registro diferido de Google Auth.
    Expira en 15 minutos.
    """
    payload = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    payload.update({"exp": expire, "iat": datetime.now(timezone.utc), "type": "pre_auth"})
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_pre_auth_jwt(token: str) -> dict:
    """
    Decodifica un JWT de registro diferido.
    Lanza jwt.ExpiredSignatureError o jwt.InvalidTokenError si es inválido.
    """
    payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    if payload.get("type") != "pre_auth":
        raise jwt.InvalidTokenError("Token type no es pre_auth")
    return payload


# ── Google OAuth Validation ────────────────────────────────────────────────────

def validate_google_token(id_token: str) -> dict:
    """
    Valida un ID Token de Google y retorna los datos del usuario.
    
    Lanza ValueError si el token es inválido o la signa no es de Google.
    Retorna: {"email": "...", "name": "...", "picture": "...", ...}
    """
    from google.auth.transport import requests
    from google.oauth2 import id_token as google_id_token
    
    try:
        # Validar que el token viene de Google
        idinfo = google_id_token.verify_oauth2_token(
            id_token,
            requests.Request(),
            settings.GOOGLE_CLIENT_ID
        )
        
        # Verificar que no es un token expirado o de otro origen
        if not idinfo.get("email_verified"):
            raise ValueError("Email no verificado en Google")
            
        return idinfo
    except ValueError as e:
        raise ValueError(f"Token de Google inválido: {str(e)}")
    except Exception as e:
        raise ValueError(f"Error al validar token de Google: {str(e)}")



