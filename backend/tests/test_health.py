import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app


@pytest.mark.asyncio
async def test_health_returns_200():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/health")
    assert resp.status_code in (200, 503)
    data = resp.json()
    assert data["status"] in ("ok", "degraded", "down")
    assert "version" in data
    assert "db" in data
    assert "redis" in data
