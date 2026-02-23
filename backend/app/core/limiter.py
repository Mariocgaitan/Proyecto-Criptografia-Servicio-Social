from slowapi import Limiter
from slowapi.util import get_remote_address

# Inicializar el limitador usando la IP del cliente como clave
limiter = Limiter(key_func=get_remote_address)
