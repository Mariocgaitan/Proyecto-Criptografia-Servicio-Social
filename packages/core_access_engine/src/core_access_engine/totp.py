"""
Motor TOTP — generación y verificación de One-Time Passwords (RFC 6238).

Compatible con Google Authenticator, Authy y cualquier app TOTP estándar.

Uso:
    from core_access_engine.totp import (
        generate_totp_secret,
        generate_totp_qr_url,
        get_current_totp_code,
        verify_totp,
        seconds_until_next_cycle,
    )

    secret = generate_totp_secret()
    qr_url = generate_totp_qr_url(secret, account="A01234567", issuer="MiApp")
    is_valid = verify_totp(code="847291", secret=secret)

NOTA: El `totp_secret` NUNCA sale del servidor. Solo se expone el `otpauth://`
URL al usuario durante el onboarding, y después exclusivamente los códigos de
6 dígitos se verifican contra el secret almacenado en la base de datos de la
app consumidora.
"""

import time

import pyotp

__all__ = [
    "generate_totp_secret",
    "generate_totp_qr_url",
    "get_current_totp_code",
    "verify_totp",
    "seconds_until_next_cycle",
]


def generate_totp_secret() -> str:
    """
    Genera un nuevo secret TOTP aleatorio (base32, 32 caracteres).

    Returns:
        Secret en base32. Debe guardarse en la base de datos (idealmente cifrado).
    """
    return pyotp.random_base32()


def generate_totp_qr_url(secret: str, account: str, issuer: str) -> str:
    """
    Genera el `otpauth://` URL para registrar en Google Authenticator.

    Args:
        secret:  Secret TOTP generado por `generate_totp_secret`.
        account: Identificador del usuario visible en el Authenticator. Ej: "A01234567"
        issuer:  Nombre de la app visible en el Authenticator. Ej: "FeriaServicioSocial"

    Returns:
        URL en formato `otpauth://totp/...` para incrustar en un QR de onboarding.
    """
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(name=account, issuer_name=issuer)


def get_current_totp_code(secret: str) -> str:
    """
    Devuelve el código TOTP de 6 dígitos vigente para este segundo.

    Usado para incrustar el código en el payload del QR dinámico.

    Args:
        secret: Secret TOTP del usuario.

    Returns:
        Código de 6 dígitos como string. Ej: "847291"
    """
    return pyotp.TOTP(secret).now()


def verify_totp(code: str, secret: str) -> bool:
    """
    Verifica que un código TOTP de 6 dígitos sea válido.

    Acepta el código del ciclo actual y ±1 ciclo para compensar desfase de reloj
    entre el servidor y el dispositivo del usuario.

    Args:
        code:   Código de 6 dígitos ingresado por el usuario o extraído del QR.
        secret: Secret TOTP almacenado en la base de datos.

    Returns:
        True si el código es válido, False en caso contrario.
    """
    return pyotp.TOTP(secret).verify(code, valid_window=1)


def seconds_until_next_cycle() -> int:
    """
    Retorna los segundos que faltan para que expire el ciclo TOTP actual.

    Útil para que el frontend sepa cuánto tiempo tiene antes de que el QR
    deje de ser válido (el polling del frontend usa este valor).

    Returns:
        Entero entre 1 y 30 (TOTP tiene ciclos de 30 segundos).
    """
    return 30 - (int(time.time()) % 30)
