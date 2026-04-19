"""Secrets provider abstraction.

Today secrets come from environment variables (.env). In production they
should come from a real secret manager (HashiCorp Vault, AWS Systems Manager
Parameter Store, GCP Secret Manager, etc.). This module is the single seam that decides where
secrets come from, so the rest of the backend never needs to change when we
migrate.

Usage: `load_secrets()` is called once at startup, before `Settings()` is
instantiated. It fetches every value exposed by the configured provider and
injects it into `os.environ`, so pydantic-settings picks it up transparently.

To add a new backend: implement `SecretsProvider.get` and register it in
`_build_provider`.
"""

from __future__ import annotations

import os
from typing import Protocol


class SecretsProvider(Protocol):
    def get(self, name: str) -> str | None: ...
    def all(self) -> dict[str, str]: ...


class EnvSecretsProvider:
    """Reads secrets from process environment (populated by .env in dev)."""

    def get(self, name: str) -> str | None:
        return os.environ.get(name)

    def all(self) -> dict[str, str]:
        return dict(os.environ)


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

    def all(self) -> dict[str, str]:
        if not self._loaded:
            self._load()
        return dict(self._cache)


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
    """Fetch every value from the provider and export it to os.environ.

    For remote providers, values fetched here override whatever may have been
    in .env. The env provider is a no-op since os.environ is already populated.
    """
    provider = _build_provider()
    # The env provider already reads from os.environ, so skip the round-trip.
    if isinstance(provider, EnvSecretsProvider):
        return
    for name, value in provider.all().items():
        os.environ[name] = value
