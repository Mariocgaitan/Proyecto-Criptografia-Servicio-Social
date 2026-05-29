"""
Gestión de contraseñas — hashing y verificación con bcrypt.

Uso:
    from core_access_engine.passwords import hash_password, verify_password

    hashed = hash_password("mi_password_segura")
    is_valid = verify_password("mi_password_segura", hashed)  # True

NOTA: bcrypt incluye el salt dentro del hash resultante, por lo que
no es necesario almacenar el salt por separado.
"""

import bcrypt

__all__ = ["hash_password", "verify_password"]


def hash_password(password: str) -> str:
    """
    Genera un hash bcrypt de la contraseña.

    Args:
        password: Contraseña en texto plano.

    Returns:
        Hash bcrypt como string (incluye salt y cost factor).
        Listo para almacenar en la base de datos.
    """
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifica una contraseña en texto plano contra su hash bcrypt.

    Args:
        plain_password:  Contraseña ingresada por el usuario.
        hashed_password: Hash almacenado en la base de datos.

    Returns:
        True si la contraseña coincide, False en caso contrario.
    """
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
