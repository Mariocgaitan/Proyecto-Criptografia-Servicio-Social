"""
Tokens opacos — generación y hashing de refresh tokens, pre-auth tokens y nonces.

Los tokens opacos (a diferencia de JWT) son strings aleatorios URL-safe.
Se guardan en la base de datos como hash SHA-256; el token raw solo viaja
en la respuesta HTTP y nunca se persiste.

Uso:
    from core_access_engine.tokens import (
        generate_refresh_token,
        hash_token,
        generate_nonce,
        hash_nonce,
    )

    raw = generate_refresh_token()
    stored_hash = hash_token(raw)  # Guardar esto en DB

    # Al recibir el token del cliente:
    client_hash = hash_token(received_token)
    is_valid = secrets.compare_digest(client_hash, stored_hash)
"""

import hashlib
import secrets
import uuid

__all__ = [
    "generate_refresh_token",
    "generate_pre_auth_token",
    "generate_nonce",
    "hash_token",
    "hash_nonce",
]


def generate_refresh_token() -> str:
    """
    Genera un refresh token aleatorio seguro.

    Returns:
        String URL-safe de 43 caracteres (32 bytes en base64-urlsafe).
        Debe enviarse al cliente y guardarse en DB solo como su hash.
    """
    return secrets.token_urlsafe(32)


def generate_pre_auth_token() -> str:
    """
    Genera un token temporal opaco para el wizard de autenticación.

    Distinto del pre-auth JWT: este token se guarda en DB para poder
    invalidarlo explícitamente si el usuario abandona el wizard.

    Returns:
        String URL-safe de 43 caracteres.
    """
    return secrets.token_urlsafe(32)


def generate_nonce() -> str:
    """
    Genera un nonce criptográfico para el flujo OAuth anti-replay.

    El nonce se envía a Google en el redirect y regresa embebido en el
    id_token. Se verifica contra el hash almacenado en DB con TTL.

    Returns:
        UUID4 como string. Ej: "550e8400-e29b-41d4-a716-446655440000"
    """
    return str(uuid.uuid4())


def hash_token(raw_token: str) -> str:
    """
    Hashea un token opaco con SHA-256 para almacenamiento seguro en DB.

    Args:
        raw_token: Token en texto plano (refresh token, pre-auth token, etc.)

    Returns:
        Hex digest SHA-256 (64 caracteres).
    """
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def hash_nonce(nonce: str) -> str:
    """
    Hashea un nonce OAuth con SHA-256 para guardarlo en DB.

    El nonce se guarda como hash y se compara con el que viene en el id_token
    de Google (también hasheado), garantizando que el nonce raw nunca esté en DB.

    Args:
        nonce: UUID4 generado por `generate_nonce`.

    Returns:
        Hex digest SHA-256.
    """
    return hashlib.sha256(nonce.encode("utf-8")).hexdigest()
