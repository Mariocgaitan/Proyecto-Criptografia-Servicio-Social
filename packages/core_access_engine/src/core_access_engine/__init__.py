"""
core_access_engine
==================
Motor criptográfico y de identidad — independiente del dominio de negocio.

Expone la API pública del paquete. Cualquier app consumidora importa
directamente desde los sub-módulos para mayor claridad, pero también puede
importar desde aquí los símbolos más usados.

Uso típico:
    from core_access_engine.crypto import encrypt_qr_payload, decrypt_qr_payload
    from core_access_engine.totp import verify_totp, generate_totp_secret
    from core_access_engine.jwt_manager import create_access_token, decode_access_token
    from core_access_engine.sms_otp import generate_sms_code, verify_sms_code, send_sms_code
    from core_access_engine.secrets import load_secrets
    from core_access_engine.logging import setup_logging

Módulos disponibles:
    config       — CoreSettings base (heredar en cada proyecto)
    crypto       — Cifrado/descifrado Fernet para QR dinámico
    totp         — TOTP RFC 6238 (Google Authenticator)
    jwt_manager  — Emisión y validación de JWT
    passwords    — Hash y verificación bcrypt
    tokens       — Refresh tokens, pre-auth tokens, nonces
    google_auth  — Validación de id_token Google OAuth 2.0
    sms_otp      — Generación y envío de OTP por SMS (Twilio / AWS SNS)
    secrets      — SecretsProvider (env / AWS SSM)
    middleware   — Security headers HTTP
    limiter      — Rate limiting SlowAPI
    logging      — Structured logging (structlog + Sentry)
"""

__version__ = "0.2.0"
