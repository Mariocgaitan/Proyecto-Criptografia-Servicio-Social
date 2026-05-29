"""
Motor criptográfico — cifrado/descifrado de payloads QR con Fernet.

Fernet = AES-128-CBC + HMAC-SHA256 + timestamp interno.
Cualquier alteración del ciphertext provoca `InvalidToken` en descifrado.

Uso:
    from core_access_engine.crypto import encrypt_qr_payload, decrypt_qr_payload

    token = encrypt_qr_payload('{"matricula": "A01234567", "totp": "847291"}', key)
    payload_json = decrypt_qr_payload(token, key)

NOTA: El `key` se recibe como parámetro explícito — este módulo NO lee
ninguna variable global de configuración. La app consumidora obtiene el key
desde su propio Settings y lo pasa al llamar estas funciones.
"""

from cryptography.fernet import Fernet, InvalidToken

__all__ = ["encrypt_qr_payload", "decrypt_qr_payload", "InvalidToken"]


def encrypt_qr_payload(payload: str, key: str) -> str:
    """
    Cifra un string JSON (payload del QR) con Fernet.

    Args:
        payload: String JSON a cifrar. Ej: '{"sub": "A01234", "totp": "123456"}'
        key:     Clave Fernet en base64-urlsafe (32 bytes codificados).
                 Proviene de settings.QR_ENCRYPTION_KEY en la app consumidora.

    Returns:
        Token cifrado como string URL-safe. Seguro para incrustar en QR.

    Raises:
        ValueError: Si el key no tiene formato Fernet válido.
    """
    f = Fernet(key.encode())
    return f.encrypt(payload.encode()).decode()


def decrypt_qr_payload(token: str, key: str) -> str:
    """
    Descifra un token Fernet y devuelve el JSON original.

    Args:
        token: Token producido por `encrypt_qr_payload`.
        key:   Misma clave usada para cifrar.

    Returns:
        String JSON original.

    Raises:
        cryptography.fernet.InvalidToken: Si el token fue alterado o expiró.
    """
    f = Fernet(key.encode())
    return f.decrypt(token.encode()).decode()
