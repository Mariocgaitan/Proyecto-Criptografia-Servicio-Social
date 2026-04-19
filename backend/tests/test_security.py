"""Security tests: authentication gates, role enforcement, input sanitization."""
from __future__ import annotations

import pytest
from httpx import AsyncClient

from app.core.limiter import limiter
from app.core.security import create_access_token


@pytest.fixture(autouse=True)
def _disable_rate_limiter():
    """Disable SlowAPI rate limiter so tests don't need a real Redis."""
    limiter.enabled = False
    yield
    limiter.enabled = True


def _cookies_for(user) -> dict[str, str]:
    """Build an access_token cookie dict for an existing user object."""
    token = create_access_token(
        {"sub": user.id_matricula, "rol": user.rol, "nombre": user.nombre},
    )
    return {"access_token": token}


# ── Protected endpoints return 401 without token ───────────────────────────

PROTECTED_GETS = [
    "/api/v1/auth/me",
    "/api/v1/alumno/dashboard",
    "/api/v1/alumno/qr-payload?id_evento=1",
    "/api/v1/alumno/estado-inscripcion",
    "/api/v1/admin/proyectos",
    "/api/v1/admin/empresas",
    "/api/v1/admin/eventos",
    "/api/v1/admin/estadisticas/kpis",
    "/api/v1/admin/sistema/cache-stats",
    "/api/v1/empresa/proyecto",
]


@pytest.mark.parametrize("path", PROTECTED_GETS)
async def test_endpoint_sin_token_retorna_401(client: AsyncClient, path: str):
    resp = await client.get(path)
    assert resp.status_code == 401, f"{path} returned {resp.status_code}, expected 401"


# ── Role enforcement ───────────────────────────────────────────────────────

async def test_alumno_en_admin_retorna_403(client: AsyncClient, sample_data):
    cookies = _cookies_for(sample_data["alumno"])
    resp = await client.get("/api/v1/admin/proyectos", cookies=cookies)
    assert resp.status_code == 403


async def test_alumno_en_empresa_retorna_403(client: AsyncClient, sample_data):
    cookies = _cookies_for(sample_data["alumno"])
    resp = await client.get("/api/v1/empresa/proyecto", cookies=cookies)
    assert resp.status_code == 403


async def test_empresa_en_admin_retorna_403(client: AsyncClient, sample_data):
    cookies = _cookies_for(sample_data["empresa_user"])
    resp = await client.get("/api/v1/admin/proyectos", cookies=cookies)
    assert resp.status_code == 403


# ── Input sanitization ─────────────────────────────────────────────────────

async def test_sql_en_login_no_rompe(client: AsyncClient, sample_data):
    resp = await client.post(
        "/api/v1/auth/login",
        json={"correo": "'; DROP TABLE usuarios;--", "password": "x"},
    )
    assert resp.status_code in (401, 422), (
        f"SQL injection payload returned {resp.status_code}, expected 401 or 422"
    )


async def test_xss_en_login_no_refleja(client: AsyncClient, sample_data):
    resp = await client.post(
        "/api/v1/auth/login",
        json={"correo": "<script>alert(1)</script>", "password": "x"},
    )
    assert "<script>" not in resp.text, "XSS payload was reflected in response body"
