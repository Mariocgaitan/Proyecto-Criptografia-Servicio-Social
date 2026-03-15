from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Base de datos
    DATABASE_URL: str = "postgresql+asyncpg://sid_user:sid_password_local@localhost:5432/sid_db"

    # SSH Tunnel (Opcional)
    USE_SSH_TUNNEL: bool = False
    SSH_HOST: str = "localhost"
    SSH_PORT: int = 22
    SSH_USER: str = "user"
    SSH_PKEY_PATH: str = "~/.ssh/id_rsa"
    
    # Remote DB settings (cuando se usa SSH Tunnel)
    REMOTE_DB_HOST: str = "127.0.0.1"
    REMOTE_DB_PORT: int = 5432
    LOCAL_BIND_PORT: int = 5433  # Puerto local para el túnel

    # JWT
    JWT_SECRET_KEY: str = "dev_secret_key_change_in_production"

    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_HOURS: int = 8

    # App
    APP_ENV: str = "development"
    DEBUG: bool = True
    SHOW_DOCS: bool = True  # False en producción para ocultar ReDoc

    # CORS — orígenes permitidos explícitos (producción). En desarrollo se
    # acepta automáticamente cualquier IP de red privada + localhost.
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ]


settings = Settings()
