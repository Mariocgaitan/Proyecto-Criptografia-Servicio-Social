"""
Gestor de JWT — emisión, validación y rotación de tokens de sesión.

Maneja tres tipos de token:
  - Access Token:   JWT firmado, vida corta (15 min por defecto).
  - Pre-Auth Token: JWT firmado, vida muy corta (10 min), usado entre
                    validación de identidad y verificación TOTP.
  - Refresh Token:  Token opaco URL-safe; se guarda como hash SHA-256 en DB.

Uso:
    from core_access_engine.jwt_manager import (
        create_access_token,
        decode_access_token,
        create_pre_auth_jwt,
        decode_pre_auth_jwt,
    )

    token = create_access_token(
        data={"sub": "A01234567", "rol": "alumno"},
        secret=settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
        expire_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
    )

NOTA: Las funciones reciben `secret`, `algorithm` y tiempos de expiración
como parámetros explícitos — no leen configuración global. Esto permite
que diferentes apps usen distintas claves con el mismo módulo.
"""

from __future__ import annotations
from datetime import datetime, timedelta, timezone

import jwt

__all__ = [
    "create_access_token",
    "decode_access_token",
    "create_pre_auth_jwt",
    "decode_pre_auth_jwt",
]


def create_access_token(
    data: dict,
    secret: str,
    algorithm: str = "HS256",
    expire_minutes: int = 15,
) -> str:
    """
    Genera un JWT de sesión firmado.

    Args:
        data:           Payload del token. Debe incluir 'sub' (identidad del usuario)
                        y 'rol' (rol en la app consumidora).
        secret:         Clave de firma. Proviene de settings.JWT_SECRET_KEY.
        algorithm:      Algoritmo HMAC. Default: "HS256".
        expire_minutes: Vida del token en minutos. Default: 15.

    Returns:
        JWT como string.
    """
    payload = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=expire_minutes)
    payload.update({"exp": expire, "iat": datetime.now(timezone.utc)})
    return jwt.encode(payload, secret, algorithm=algorithm)


def decode_access_token(token: str, secret: str, algorithm: str = "HS256") -> dict:
    """
    Decodifica y valida un JWT de sesión.

    Args:
        token:     JWT a validar.
        secret:    Clave de firma. Debe coincidir con la usada en `create_access_token`.
        algorithm: Algoritmo. Default: "HS256".

    Returns:
        Payload del token como dict.

    Raises:
        jwt.ExpiredSignatureError: Token expirado.
        jwt.InvalidTokenError:     Token inválido o manipulado.
    """
    return jwt.decode(token, secret, algorithms=[algorithm])


def create_pre_auth_jwt(
    data: dict,
    secret: str,
    algorithm: str = "HS256",
    expire_minutes: int = 10,
) -> str:
    """
    Genera un JWT temporal para el wizard de autenticación multi-paso.

    Se emite después de validar la identidad (Google OAuth o password) y
    antes de verificar el TOTP. Lleva el claim `"type": "pre_auth"` para
    distinguirlo de los access tokens normales.

    Args:
        data:           Payload. Debe incluir 'sub' (email o matrícula).
        secret:         Clave de firma.
        algorithm:      Algoritmo HMAC. Default: "HS256".
        expire_minutes: Vida del token. Default: 10 minutos.

    Returns:
        JWT pre-auth como string.
    """
    payload = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=expire_minutes)
    payload.update({"exp": expire, "iat": datetime.now(timezone.utc), "type": "pre_auth"})
    return jwt.encode(payload, secret, algorithm=algorithm)


def decode_pre_auth_jwt(token: str, secret: str, algorithm: str = "HS256") -> dict:
    """
    Decodifica y valida un JWT pre-auth.

    Verifica que el claim `"type"` sea `"pre_auth"` para evitar que un
    access token normal sea usado en el endpoint de verificación TOTP.

    Raises:
        jwt.InvalidTokenError: Si el token no es de tipo pre_auth.
    """
    payload = jwt.decode(token, secret, algorithms=[algorithm])
    if payload.get("type") != "pre_auth":
        raise jwt.InvalidTokenError("Token type no es pre_auth")
    return payload
