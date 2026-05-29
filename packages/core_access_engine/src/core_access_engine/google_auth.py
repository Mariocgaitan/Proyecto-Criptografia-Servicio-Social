"""
Google Auth — validación de id_token de Google OAuth 2.0 (OIDC).

Verifica la firma criptográfica del `id_token` contra los certificados
públicos de Google. No requiere llamada a la red de Google después de la
primera vez (los certs se cachean por TTL).

Uso:
    from core_access_engine.google_auth import validate_google_id_token

    claims = validate_google_id_token(
        id_token=request_data.credential,
        client_id=settings.GOOGLE_CLIENT_ID,
    )
    email = claims["email"]
    name  = claims.get("name")

El flujo anti-replay (nonce) lo maneja la app consumidora:
    1. La app genera un nonce (ver `core_access_engine.tokens.generate_nonce`)
    2. Lo guarda en DB con TTL
    3. Lo envía a Google en el redirect
    4. Valida el nonce del claims contra el almacenado
    5. Borra el nonce de DB (single-use)
Este módulo solo hace la validación criptográfica del token.
"""

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

__all__ = ["validate_google_id_token", "GoogleAuthError"]


class GoogleAuthError(Exception):
    """Lanzado cuando la validación del id_token de Google falla."""


def validate_google_id_token(id_token: str, client_id: str) -> dict:
    """
    Valida un id_token de Google y devuelve sus claims.

    Verifica:
      - Firma criptográfica contra los certificados públicos de Google
      - `aud` coincide con `client_id`
      - `iss` es `accounts.google.com` o `https://accounts.google.com`
      - El token no ha expirado

    Args:
        id_token:  Token JWT obtenido del botón de Google Sign-In en el frontend.
        client_id: Google OAuth Client ID de la app consumidora.
                   Proviene de settings.GOOGLE_CLIENT_ID.

    Returns:
        Dict con los claims del token. Campos relevantes:
          - "sub":            ID único de Google del usuario
          - "email":          Email verificado
          - "email_verified": bool
          - "name":           Nombre completo (si está disponible)
          - "picture":        URL del avatar (si está disponible)
          - "nonce":          Nonce hasheado (para verificación anti-replay)

    Raises:
        GoogleAuthError: Si la validación falla por cualquier razón.
    """
    try:
        idinfo = google_id_token.verify_oauth2_token(
            id_token,
            google_requests.Request(),
            client_id,
        )
        if not idinfo.get("email_verified"):
            raise GoogleAuthError("Email no verificado en Google")
        return idinfo
    except ValueError as e:
        raise GoogleAuthError(f"Token de Google inválido: {e}") from e
    except Exception as e:
        raise GoogleAuthError(f"Error al validar token de Google: {e}") from e
