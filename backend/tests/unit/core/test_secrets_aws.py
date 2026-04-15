"""Tests for AwsParameterStoreProvider.

These tests stub boto3 so they do not require real AWS credentials.
"""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from app.core.secrets import SECRET_KEYS


@pytest.fixture
def fake_ssm_page() -> dict:
    return {
        "Parameters": [
            {"Name": "/sid/prod/JWT_SECRET_KEY", "Value": "jwt-value"},
            {"Name": "/sid/prod/QR_ENCRYPTION_KEY", "Value": "qr-value"},
            {"Name": "/sid/prod/DATABASE_URL", "Value": "db-value"},
            {"Name": "/sid/prod/SMTP_PASSWORD", "Value": "smtp-value"},
            {"Name": "/sid/prod/GOOGLE_CLIENT_ID", "Value": "google-value"},
            {"Name": "/sid/prod/REDIS_URL", "Value": "redis-value"},
        ]
    }


def _make_fake_client(page: dict) -> MagicMock:
    fake_client = MagicMock()
    fake_paginator = MagicMock()
    fake_paginator.paginate.return_value = iter([page])
    fake_client.get_paginator.return_value = fake_paginator
    return fake_client


def test_aws_provider_strips_prefix_and_returns_value(fake_ssm_page):
    from app.core.secrets import AwsParameterStoreProvider

    fake_client = _make_fake_client(fake_ssm_page)
    with patch("boto3.client", return_value=fake_client) as boto_client:
        provider = AwsParameterStoreProvider(prefix="/sid/prod", region="us-east-1")
        assert provider.get("JWT_SECRET_KEY") == "jwt-value"
        assert provider.get("DATABASE_URL") == "db-value"
        assert provider.get("REDIS_URL") == "redis-value"
        boto_client.assert_called_once_with("ssm", region_name="us-east-1")


def test_aws_provider_caches_after_first_call(fake_ssm_page):
    from app.core.secrets import AwsParameterStoreProvider

    fake_client = _make_fake_client(fake_ssm_page)
    with patch("boto3.client", return_value=fake_client):
        provider = AwsParameterStoreProvider(prefix="/sid/prod", region="us-east-1")
        provider.get("JWT_SECRET_KEY")
        provider.get("QR_ENCRYPTION_KEY")
        provider.get("DATABASE_URL")

    # get_paginator must be called exactly once, not per key.
    assert fake_client.get_paginator.call_count == 1


def test_aws_provider_returns_none_for_unknown_key(fake_ssm_page):
    from app.core.secrets import AwsParameterStoreProvider

    fake_client = _make_fake_client(fake_ssm_page)
    with patch("boto3.client", return_value=fake_client):
        provider = AwsParameterStoreProvider(prefix="/sid/prod", region="us-east-1")
        assert provider.get("NOPE") is None


def test_aws_provider_handles_trailing_slash_in_prefix(fake_ssm_page):
    from app.core.secrets import AwsParameterStoreProvider

    fake_client = _make_fake_client(fake_ssm_page)
    with patch("boto3.client", return_value=fake_client):
        provider = AwsParameterStoreProvider(prefix="/sid/prod/", region="us-east-1")
        assert provider.get("JWT_SECRET_KEY") == "jwt-value"


def test_build_provider_selects_aws_backend(monkeypatch):
    from app.core import secrets as secrets_module

    monkeypatch.setenv("SECRETS_BACKEND", "aws")
    monkeypatch.setenv("AWS_SECRETS_PREFIX", "/sid/prod")
    monkeypatch.setenv("AWS_REGION", "us-east-1")

    # boto3.client is patched so construction does not touch real AWS;
    # _load() is not exercised here — that's covered by other tests.
    with patch("boto3.client", return_value=MagicMock()):
        provider = secrets_module._build_provider()
        assert isinstance(provider, secrets_module.AwsParameterStoreProvider)


def test_build_provider_aws_fails_fast_when_prefix_missing(monkeypatch):
    from app.core import secrets as secrets_module

    monkeypatch.setenv("SECRETS_BACKEND", "aws")
    monkeypatch.delenv("AWS_SECRETS_PREFIX", raising=False)

    with pytest.raises(KeyError):
        secrets_module._build_provider()


def test_load_secrets_populates_os_environ_from_aws(monkeypatch, fake_ssm_page):
    from app.core import secrets as secrets_module

    monkeypatch.setenv("SECRETS_BACKEND", "aws")
    monkeypatch.setenv("AWS_SECRETS_PREFIX", "/sid/prod")
    monkeypatch.setenv("AWS_REGION", "us-east-1")
    for key in SECRET_KEYS:
        monkeypatch.delenv(key, raising=False)

    fake_client = _make_fake_client(fake_ssm_page)
    with patch("boto3.client", return_value=fake_client):
        secrets_module.load_secrets()

    import os
    assert os.environ["JWT_SECRET_KEY"] == "jwt-value"
    assert os.environ["DATABASE_URL"] == "db-value"
    assert os.environ["REDIS_URL"] == "redis-value"
    # Keys present in SECRET_KEYS but absent from Parameter Store must
    # not be injected into the environment (harmless placeholder behavior).
    assert "SENTRY_DSN" not in os.environ


def test_redis_url_is_in_secret_keys():
    # Guardrail: REDIS_URL must be fetched from the provider because it
    # carries a password in production.
    assert "REDIS_URL" in SECRET_KEYS
