"""Tests for QR crypto utilities and QR-related endpoints."""
from __future__ import annotations

import json

import pytest
from cryptography.fernet import InvalidToken
from httpx import AsyncClient

from app.core.crypto import decrypt_qr_payload, encrypt_qr_payload
from app.core.limiter import limiter


@pytest.fixture(autouse=True)
def _disable_rate_limiter():
    """Disable SlowAPI rate limiter for all tests in this module."""
    limiter.enabled = False
    yield
    limiter.enabled = True


# ── QR Crypto unit tests (no async needed) ───────────────────────────────────

def test_encrypt_decrypt_roundtrip():
    """Encrypting and then decrypting a JSON payload returns the original."""
    payload = json.dumps({"id_matricula": "A01000001", "id_evento": 1, "ts": 12345})
    token = encrypt_qr_payload(payload)

    assert isinstance(token, str)
    assert token != payload  # must actually be encrypted

    recovered = decrypt_qr_payload(token)
    assert recovered == payload


def test_decrypt_invalid_token():
    """Decrypting garbage raises cryptography.fernet.InvalidToken."""
    with pytest.raises(InvalidToken):
        decrypt_qr_payload("not-a-valid-fernet-token-at-all")


# ── QR endpoint (alumno) ──────────────────────────────────────────────────────

async def test_alumno_genera_qr(client: AsyncClient, sample_data):
    """Alumno GET /api/v1/alumno/qr-payload returns 200 with qr_data field."""
    from app.core.security import create_access_token

    alumno = sample_data["alumno"]
    token = create_access_token(
        {"sub": alumno.id_matricula, "rol": alumno.rol, "nombre": alumno.nombre}
    )
    cookies = {"access_token": token}
    id_evento = sample_data["evento"].id_evento

    resp = await client.get(
        "/api/v1/alumno/qr-payload",
        params={"id_evento": id_evento},
        cookies=cookies,
    )

    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert "qr_data" in body


# ── Empresa scan endpoint ─────────────────────────────────────────────────────

async def test_empresa_escanea_qr_invalido(client: AsyncClient, sample_data):
    """Empresa POST /api/v1/empresa/escanear with invalid QR returns 4xx (not 500)."""
    from app.core.security import create_access_token

    empresa_user = sample_data["empresa_user"]
    token = create_access_token(
        {"sub": empresa_user.id_matricula, "rol": empresa_user.rol, "nombre": empresa_user.nombre}
    )
    cookies = {"access_token": token}
    id_proyecto = sample_data["proyecto"].id_proyecto

    resp = await client.post(
        "/api/v1/empresa/escanear",
        json={"qr_data": "invalid-garbage", "id_proyecto": id_proyecto},
        cookies=cookies,
    )

    # Invalid Fernet token should surface as a client error, not a server crash.
    assert resp.status_code < 500, (
        f"Expected a 4xx response for invalid QR, got {resp.status_code}: {resp.text}"
    )
    assert resp.status_code >= 400, (
        f"Expected an error status code, got {resp.status_code}: {resp.text}"
    )
