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
    from core_access_engine.secrets import load_secrets
    from core_access_engine.logging import setup_logging
"""

__version__ = "0.1.0"
