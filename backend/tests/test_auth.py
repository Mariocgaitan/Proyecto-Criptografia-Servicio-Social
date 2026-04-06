"""Integration tests for auth endpoints (login, refresh, logout, /me)."""
from __future__ import annotations

import pytest
from httpx import AsyncClient

from app.core.limiter import limiter


@pytest.fixture(autouse=True)
def _disable_rate_limiter():
    """Disable SlowAPI rate limiter so tests don't need a real Redis."""
    limiter.enabled = False
    yield
    limiter.enabled = True


# ── Login ────────────────────────────────────────────────────────────────────

async def test_login_correcto(client: AsyncClient, sample_data):
    resp = await client.post(
        "/api/v1/auth/login",
        json={"correo": "alumno@tec.mx", "password": "Test1234!"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"
    assert "access_token" in resp.cookies
    assert "refresh_token" in resp.cookies


async def test_login_password_incorrecto(client: AsyncClient, sample_data):
    resp = await client.post(
        "/api/v1/auth/login",
        json={"correo": "alumno@tec.mx", "password": "WrongPass1!"},
    )
    assert resp.status_code == 401


async def test_login_usuario_no_existe(client: AsyncClient, sample_data):
    resp = await client.post(
        "/api/v1/auth/login",
        json={"correo": "noexiste@tec.mx", "password": "Test1234!"},
    )
    assert resp.status_code == 401


# ── Refresh ──────────────────────────────────────────────────────────────────

async def test_refresh_token_valido(client: AsyncClient, sample_data):
    # Login first to obtain cookies
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"correo": "alumno@tec.mx", "password": "Test1234!"},
    )
    assert login_resp.status_code == 200
    cookies = {k: v for k, v in login_resp.cookies.items()}

    # Refresh using the cookies from login
    refresh_resp = await client.post("/api/v1/auth/refresh", cookies=cookies)
    assert refresh_resp.status_code == 200
    assert "access_token" in refresh_resp.json()


async def test_refresh_sin_cookie(client: AsyncClient, sample_data):
    resp = await client.post("/api/v1/auth/refresh")
    assert resp.status_code == 401


# ── Logout ───────────────────────────────────────────────────────────────────

async def test_logout(client: AsyncClient, sample_data):
    # Login first
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"correo": "alumno@tec.mx", "password": "Test1234!"},
    )
    cookies = {k: v for k, v in login_resp.cookies.items()}

    # Logout
    logout_resp = await client.post("/api/v1/auth/logout", cookies=cookies)
    assert logout_resp.status_code == 200
    assert logout_resp.json()["message"] == "Sesión cerrada exitosamente"


# ── /me ──────────────────────────────────────────────────────────────────────

async def test_me_autenticado(client: AsyncClient, auth_cookies):
    cookies = await auth_cookies("alumno", matricula="A01000001")
    resp = await client.get("/api/v1/auth/me", cookies=cookies)
    assert resp.status_code == 200
    body = resp.json()
    assert body["id_matricula"] == "A01000001"
    assert body["rol"] == "alumno"


async def test_me_sin_token(client: AsyncClient, sample_data):
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 401
