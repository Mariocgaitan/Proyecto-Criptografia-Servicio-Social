from cryptography.fernet import Fernet
from app.core.config import settings

def encrypt_qr_payload(payload: str) -> str:
    """
    Cifra el payload JSON del QR usando Fernet (AES-128 en CBC + HMAC SHA256).
    Retorna un string (token) seguro.
    """
    f = Fernet(settings.QR_ENCRYPTION_KEY.encode())
    return f.encrypt(payload.encode()).decode()

def decrypt_qr_payload(token: str) -> str:
    """
    Descifra un token de QR y retorna el string original (JSON).
    Lanza cryptography.fernet.InvalidToken si el cifrado es inválido.
    """
    f = Fernet(settings.QR_ENCRYPTION_KEY.encode())
    return f.decrypt(token.encode()).decode()
