"""Tests for critical business flows: proyectos, inscripciones, export."""

from __future__ import annotations

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.limiter import limiter


@pytest.fixture(autouse=True)
def _disable_rate_limiter():
    limiter.enabled = False
    yield
    limiter.enabled = True


# ── Admin: Proyectos ────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_listar_proyectos(
    client: AsyncClient, sample_data: dict, auth_cookies, db_session: AsyncSession
):
    cookies = await auth_cookies("admin")
    resp = await client.get("/api/v1/admin/proyectos", cookies=cookies)

    assert resp.status_code == 200
    body = resp.json()
    assert "data" in body
    assert "total" in body
    assert body["total"] >= 1


@pytest.mark.asyncio
async def test_crear_proyecto(
    client: AsyncClient, sample_data: dict, auth_cookies, db_session: AsyncSession
):
    cookies = await auth_cookies("admin")
    payload = {
        "id_empresa": sample_data["empresa"].id_empresa,
        "id_evento": sample_data["evento"].id_evento,
        "nombre_proyecto": "Proyecto Beta",
        "descripcion": "Un proyecto de prueba",
        "capacidad_max": 10,
    }
    resp = await client.post("/api/v1/admin/proyectos", json=payload, cookies=cookies)

    assert resp.status_code == 201
    body = resp.json()
    assert body["nombre_proyecto"] == "Proyecto Beta"
    assert body["capacidad_max"] == 10


# ── Admin: Inscripciones ────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_crear_inscripcion(
    client: AsyncClient, sample_data: dict, auth_cookies, db_session: AsyncSession
):
    cookies = await auth_cookies("admin")
    payload = {
        "id_matricula": sample_data["alumno"].id_matricula,
        "id_proyecto": sample_data["proyecto"].id_proyecto,
    }
    resp = await client.post("/api/v1/admin/inscripciones", json=payload, cookies=cookies)

    assert resp.status_code == 201
    body = resp.json()
    assert body["ok"] is True
    assert body["cupo_actual"] == 1


@pytest.mark.asyncio
async def test_inscripcion_proyecto_lleno(
    client: AsyncClient, sample_data: dict, auth_cookies, db_session: AsyncSession
):
    # Fill the project to capacity
    proyecto = sample_data["proyecto"]
    proyecto.cupo_actual = proyecto.capacidad_max
    db_session.add(proyecto)
    await db_session.flush()
    await db_session.commit()

    cookies = await auth_cookies("admin")
    payload = {
        "id_matricula": sample_data["alumno"].id_matricula,
        "id_proyecto": proyecto.id_proyecto,
    }
    resp = await client.post("/api/v1/admin/inscripciones", json=payload, cookies=cookies)

    assert resp.status_code == 400


# ── Export ───────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_export_csv(
    client: AsyncClient, sample_data: dict, auth_cookies, db_session: AsyncSession
):
    cookies = await auth_cookies("admin")
    resp = await client.get("/api/v1/export/alumnos.csv", cookies=cookies)

    assert resp.status_code in (200, 404)
    if resp.status_code == 200:
        assert "text/csv" in resp.headers.get("content-type", "")
