"""
CoreSettings — configuración base del motor de autenticación y criptografía.

Cada app consumidora extiende esta clase con sus propios campos de negocio:

    # En feria-app/app/core/config.py:
    from core_access_engine.config import CoreSettings

    class Settings(CoreSettings):
        DATABASE_URL: str
        SSH_HOST: str
        SMTP_HOST: str
        ...

    # En barberia-app/app/core/config.py:
    from core_access_engine.config import CoreSettings

    class Settings(CoreSettings):
        DATABASE_URL: str
        STRIPE_API_KEY: str
        ...

CoreSettings define ÚNICAMENTE los campos necesarios para que funcionen
los módulos crypto, totp, jwt_manager, passwords, tokens, google_auth,
limiter y logging. No contiene ninguna referencia a modelos de dominio.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class CoreSettings(BaseSettings):
    """
    Configuración mínima requerida por core_access_engine.
    Los valores se leen desde variables de entorno (o .env) por defecto.
    """

    model_config = SettingsConfigDict(
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",  # Permite que las subclases agreguen campos sin romper la carga
    )

    # ── Criptografía del QR ───────────────────────────────────────────────
    # Clave Fernet de 32 bytes codificada en base64-urlsafe.
    # Generar con: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    QR_ENCRYPTION_KEY: str

    # ── JWT ───────────────────────────────────────────────────────────────
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_HOURS: int = 168       # 7 días
    PRE_AUTH_TOKEN_EXPIRE_MINUTES: int = 10     # Wizard de 2FA

    # ── Google OAuth 2.0 ─────────────────────────────────────────────────
    GOOGLE_CLIENT_ID: str

    # ── Redis (Rate limiting + invalidación de sesiones) ─────────────────
    # Opcional: si no se define, el rate limiter usa memoria en proceso.
    REDIS_URL: str | None = None

    # ── Entorno de ejecución ─────────────────────────────────────────────
    APP_ENV: str = "development"  # "development" | "production"

    # ── Sentry (observabilidad) ───────────────────────────────────────────
    # Vacío = Sentry desactivado (seguro en desarrollo).
    SENTRY_DSN: str = ""

    # ── Lockout de login ─────────────────────────────────────────────────
    MAX_FAILED_LOGIN_ATTEMPTS: int = 5
    LOCKOUT_DURATION_MINUTES: int = 15

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"
