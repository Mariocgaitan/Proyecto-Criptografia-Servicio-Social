"""
Secrets provider — abstracción para cargar secretos desde distintos backends.

Soporta dos backends intercambiables mediante la variable de entorno
`SECRETS_BACKEND`:
  - "env" (default): lee desde variables de entorno / archivo .env (desarrollo)
  - "aws":           lee desde AWS Systems Manager Parameter Store (producción)

El proveedor activo se selecciona en `load_secrets()`, que se llama UNA VEZ
al arranque de la app antes de que pydantic-settings lea la configuración.
Los valores se inyectan en `os.environ` para que `CoreSettings` (y cualquier
subclase) los encuentre transparentemente.

Uso en la app consumidora (antes de instanciar Settings):
    from core_access_engine.secrets import load_secrets
    load_secrets()   # ← llamar en el lifespan / startup

    from app.core.config import settings  # ahora tiene todos los valores

Para agregar un nuevo backend:
    1. Implementar la interfaz `SecretsProvider` (método `get` y `all`).
    2. Registrarlo en `_build_provider()`.
"""

from __future__ import annotations

import os
from typing import Protocol


# ---------------------------------------------------------------------------
# Interfaz / Protocol
# ---------------------------------------------------------------------------

class SecretsProvider(Protocol):
    def get(self, name: str) -> str | None: ...
    def all(self) -> dict[str, str]: ...


# ---------------------------------------------------------------------------
# Backend: variables de entorno (desarrollo)
# ---------------------------------------------------------------------------

class EnvSecretsProvider:
    """Lee secretos del entorno del proceso (populado por .env en desarrollo)."""

    def get(self, name: str) -> str | None:
        return os.environ.get(name)

    def all(self) -> dict[str, str]:
        return dict(os.environ)


# ---------------------------------------------------------------------------
# Backend: AWS Systems Manager Parameter Store (producción)
# ---------------------------------------------------------------------------

class AwsParameterStoreProvider:
    """
    Lee secretos desde AWS SSM Parameter Store bajo un prefijo dado.

    Una llamada paginada `get_parameters_by_path` carga todos los parámetros
    al arranque; los valores se cachean en memoria durante la vida del proceso.

    Variables de entorno requeridas para este backend:
        AWS_SECRETS_PREFIX  — Ej: "/feria/prod" o "/barberia/prod"
        AWS_REGION          — Ej: "us-east-1" (default)

    El EC2 necesita un IAM Role con política `AmazonSSMReadOnlyAccess`.
    """

    def __init__(self, prefix: str, region: str) -> None:
        import boto3
        self._prefix = prefix.rstrip("/")
        self._client = boto3.client("ssm", region_name=region)
        self._cache: dict[str, str] = {}
        self._loaded = False

    def _load(self) -> None:
        paginator = self._client.get_paginator("get_parameters_by_path")
        for page in paginator.paginate(
            Path=self._prefix, Recursive=True, WithDecryption=True
        ):
            for param in page["Parameters"]:
                key = param["Name"].removeprefix(self._prefix + "/")
                self._cache[key] = param["Value"]
        self._loaded = True

    def get(self, name: str) -> str | None:
        if not self._loaded:
            self._load()
        return self._cache.get(name)

    def all(self) -> dict[str, str]:
        if not self._loaded:
            self._load()
        return dict(self._cache)


# ---------------------------------------------------------------------------
# Factory y función principal
# ---------------------------------------------------------------------------

def _build_provider() -> SecretsProvider:
    backend = os.environ.get("SECRETS_BACKEND", "env").lower()
    if backend == "env":
        return EnvSecretsProvider()
    if backend == "aws":
        prefix = os.environ["AWS_SECRETS_PREFIX"]
        region = os.environ.get("AWS_REGION", "us-east-1")
        return AwsParameterStoreProvider(prefix=prefix, region=region)
    raise ValueError(f"SECRETS_BACKEND desconocido: '{backend}'. Valores válidos: 'env', 'aws'")


def load_secrets() -> None:
    """
    Carga todos los secretos del backend activo en `os.environ`.

    Debe llamarse UNA VEZ al inicio de la aplicación, antes de instanciar
    Settings. Es idempotente: llamadas subsecuentes no causan errores.

    Ejemplo en FastAPI lifespan:
        @asynccontextmanager
        async def lifespan(app: FastAPI):
            load_secrets()
            yield
    """
    provider = _build_provider()
    for key, value in provider.all().items():
        os.environ.setdefault(key, value)
