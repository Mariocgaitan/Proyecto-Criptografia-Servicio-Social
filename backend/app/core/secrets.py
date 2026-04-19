"""Secrets provider abstraction.

Today secrets come from environment variables (.env). In production they
should come from a real secret manager (HashiCorp Vault, AWS Systems Manager
Parameter Store, GCP Secret Manager, etc.). This module is the single seam that decides where
secrets come from, so the rest of the backend never needs to change when we
migrate.

Usage: `load_secrets()` is called once at startup, before `Settings()` is
instantiated. It fetches every name in `SECRET_KEYS` from the configured
provider and injects it into `os.environ`, so pydantic-settings picks it up
transparently.

To add a new backend: implement `SecretsProvider.get` and register it in
`_build_provider`.
"""

from __future__ import annotations

import os
from typing import Protocol


# Names of settings that are secrets and must be sourced from the provider.
# Non-secret config (ports, flags, URLs without credentials) stays in .env.
SECRET_KEYS: tuple[str, ...] = (
    "JWT_SECRET_KEY",
    "QR_ENCRYPTION_KEY",
    "SMTP_PASSWORD",
    "DATABASE_URL",
    "GOOGLE_CLIENT_ID",
    "REDIS_URL",
    "SENTRY_DSN",
)


class SecretsProvider(Protocol):
    def get(self, name: str) -> str | None: ...


class EnvSecretsProvider:
    """Reads secrets from process environment (populated by .env in dev)."""

    def get(self, name: str) -> str | None:
        return os.environ.get(name)


class AwsParameterStoreProvider:
    """Reads secrets from AWS Systems Manager Parameter Store under a prefix.

    One paginated `get_parameters_by_path` call pulls every parameter at boot;
    values are cached in-memory for the lifetime of the process.
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


def _build_provider() -> SecretsProvider:
    backend = os.environ.get("SECRETS_BACKEND", "env").lower()
    if backend == "env":
        return EnvSecretsProvider()
    if backend == "aws":
        prefix = os.environ["AWS_SECRETS_PREFIX"]
        region = os.environ.get("AWS_REGION", "us-east-1")
        return AwsParameterStoreProvider(prefix=prefix, region=region)
    # Future: "vault", "gcp", "sops". Each adds one branch here.
    raise ValueError(f"Unknown SECRETS_BACKEND: {backend!r}")


def load_secrets() -> None:
    """Fetch every known secret from the provider and export it to os.environ.

    Idempotent: if a secret is already set in the environment and the provider
    is env-based, this is a no-op. For remote providers, values fetched here
    override whatever may have been in .env.
    """
    provider = _build_provider()
    # The env provider already reads from os.environ, so skip the round-trip.
    if isinstance(provider, EnvSecretsProvider):
        return
    for name in SECRET_KEYS:
        value = provider.get(name)
        if value is not None:
            os.environ[name] = value
