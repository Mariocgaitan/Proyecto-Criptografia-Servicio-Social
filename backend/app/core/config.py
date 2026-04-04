import json
from pathlib import Path
from typing import Annotated

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


PROJECT_ROOT = Path(__file__).resolve().parents[3]
ROOT_ENV_FILE = PROJECT_ROOT / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(ROOT_ENV_FILE),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

    # Base de datos
    DATABASE_URL: str

    # SSH Tunnel (Opcional)
    USE_SSH_TUNNEL: bool
    SSH_HOST: str
    SSH_PORT: int
    SSH_USER: str
    SSH_PKEY_PATH: str
    
    # Remote DB settings (cuando se usa SSH Tunnel)
    REMOTE_DB_HOST: str
    REMOTE_DB_PORT: int
    LOCAL_BIND_PORT: int  # Puerto local para el túnel

    # JWT
    JWT_SECRET_KEY: str
    QR_ENCRYPTION_KEY: str

    JWT_ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    REFRESH_TOKEN_EXPIRE_HOURS: int
    PRE_AUTH_TOKEN_EXPIRE_MINUTES: int  # El temp_token expira en 10 minutos

    # Google OAuth
    GOOGLE_CLIENT_ID: str

    # Correos (SMTP)
    SMTP_HOST: str  # Servidor SMTP de Outlook/Office365
    SMTP_PORT: int
    SMTP_USER: str
    SMTP_PASSWORD: str
    SMTP_FROM_EMAIL: str

    # App
    APP_ENV: str
    DEBUG: bool
    SHOW_DOCS: bool  # False en producción para ocultar ReDoc

    # Role switch para pruebas locales: permite simular un rol distinto para
    # un correo especifico sin persistir cambios en la BD.
    TEST_ROLE_SWITCH_ENABLED: bool
    TEST_ROLE_SWITCH_EMAIL: str
    TEST_ROLE_SWITCH_ROLE: str

    # CORS — orígenes permitidos explícitos (producción). En desarrollo se
    # acepta automáticamente cualquier IP de red privada + localhost.
    ALLOWED_ORIGINS: Annotated[list[str], NoDecode]

    # HTTPS local (mkcert)
    USE_HTTPS: bool
    SSL_CERTFILE: str
    SSL_KEYFILE: str

    # Login lockout
    MAX_FAILED_LOGIN_ATTEMPTS: int
    LOCKOUT_DURATION_MINUTES: int

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Sentry
    SENTRY_DSN: str = ""

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_allowed_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, list):
            return [item.strip() for item in value if item and item.strip()]

        if isinstance(value, str):
            raw = value.strip()
            if not raw:
                return []

            if raw.startswith("["):
                parsed = json.loads(raw)
                if not isinstance(parsed, list):
                    raise ValueError("ALLOWED_ORIGINS JSON must be an array of strings")
                return [str(item).strip() for item in parsed if str(item).strip()]

            return [item.strip() for item in raw.split(",") if item.strip()]

        raise ValueError("ALLOWED_ORIGINS must be a list, JSON array string, or comma-separated string")

    @model_validator(mode="after")
    def validate_production_secrets(self) -> "Settings":
        if self.APP_ENV == "production":
            if len(self.JWT_SECRET_KEY.strip()) < 32:
                raise ValueError("JWT_SECRET_KEY must have at least 32 characters in production")
            if len(self.QR_ENCRYPTION_KEY.strip()) < 32:
                raise ValueError("QR_ENCRYPTION_KEY appears invalid in production")
            if self.TEST_ROLE_SWITCH_ENABLED:
                raise ValueError("TEST_ROLE_SWITCH_ENABLED must be False in production")
            if self.DEBUG:
                raise ValueError("DEBUG must be False in production")
            if self.SHOW_DOCS:
                raise ValueError("SHOW_DOCS must be False in production")
        return self

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"

    @property
    def cookie_secure(self) -> bool:
        return self.is_production or self.USE_HTTPS


settings = Settings()
