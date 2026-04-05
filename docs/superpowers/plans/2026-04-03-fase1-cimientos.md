# Fase 1: Cimientos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up Redis, structured logging, Sentry, startup validation, health endpoint, fix Dockerfile, and testing infrastructure for both backend (pytest) and frontend (vitest).

**Architecture:** Add Redis as a shared service (docker-compose + async client). Replace all `print()` with `structlog` JSON logging. Add Sentry SDK for exception tracking. Add startup validation in FastAPI lifespan. Setup pytest with async fixtures and vitest with jsdom.

**Tech Stack:** Redis 7 + redis.asyncio, structlog, sentry-sdk[fastapi], pytest + pytest-asyncio + httpx + fakeredis, vitest + @testing-library/react + jsdom

---

## File Structure

### New files (backend)
- `app/core/redis.py` — async Redis client, connect/disconnect, health check
- `app/core/logging.py` — structlog configuration, request_id processor
- `app/routers/health.py` — GET /health endpoint
- `tests/conftest.py` — pytest fixtures (db, client, redis, auth helpers)
- `tests/test_health.py` — tests for health endpoint

### Modified files (backend)
- `pyproject.toml` — add structlog, sentry-sdk, redis, fakeredis deps
- `app/core/config.py` — add REDIS_URL, SENTRY_DSN settings
- `app/main.py` — integrate structlog, sentry, redis lifecycle, request_id middleware, health router
- `app/core/limiter.py` — no changes in this phase (Redis storage comes in Phase 2)
- `docker-compose.yml` — add redis service
- `Dockerfile` — update python:3.11-slim to python:3.12-slim

### New files (frontend)
- `vitest.config.js` — vitest configuration
- `src/test/setup.js` — global test setup (fetch mock, etc.)
- `src/test/example.test.jsx` — smoke test to verify setup works

### Modified files (frontend)
- `package.json` — add vitest, @testing-library/react, jsdom devDependencies

---

## Task 1: Add Redis to docker-compose

**Files:**
- Modify: `docker-compose.yml`

- [ ] **Step 1: Add redis service to docker-compose.yml**

Add after the `db` service:

```yaml
  redis:
    image: redis:7-alpine
    container_name: sid_redis
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped
```

Add to volumes section: nothing needed (Redis is ephemeral cache).

- [ ] **Step 2: Verify Redis starts**

Run: `docker compose up redis -d && docker compose exec redis redis-cli ping`
Expected: `PONG`

- [ ] **Step 3: Commit**

```bash
git add docker-compose.yml
git commit -m "infra: add Redis service to docker-compose"
```

---

## Task 2: Add new dependencies to pyproject.toml

**Files:**
- Modify: `backend/pyproject.toml`

- [ ] **Step 1: Add production dependencies**

Add to `dependencies` list after the `requests` entry:

```toml
    # Cache
    "redis>=5.0.0",
    # Logging
    "structlog>=24.0.0",
    # Error tracking
    "sentry-sdk[fastapi]>=2.0.0",
```

- [ ] **Step 2: Add test dependencies**

Replace the `[dependency-groups] dev` section with:

```toml
[dependency-groups]
dev = [
    "pytest>=8.0.0",
    "pytest-asyncio>=0.24.0",
    "httpx>=0.27.0",
    "fakeredis>=2.21.0",
    "aiosqlite>=0.20.0",
]
```

- [ ] **Step 3: Install dependencies**

Run: `cd /home/alaiinx/codigos/Algebras_modernas/Proyecto-Criptografia-Servicio-Social/backend && uv sync`
Expected: all packages install successfully

- [ ] **Step 4: Commit**

```bash
git add backend/pyproject.toml backend/uv.lock
git commit -m "deps: add redis, structlog, sentry-sdk, fakeredis, aiosqlite"
```

---

## Task 3: Add REDIS_URL and SENTRY_DSN to config

**Files:**
- Modify: `backend/app/core/config.py`

- [ ] **Step 1: Add new settings fields**

Add after `LOCKOUT_DURATION_MINUTES: int` (line 77):

```python
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Sentry
    SENTRY_DSN: str = ""
```

These have defaults so existing .env files won't break.

- [ ] **Step 2: Add .env example entries**

If a `.env.example` or `.env` exists at root, add:

```
REDIS_URL=redis://localhost:6379/0
SENTRY_DSN=
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/core/config.py
git commit -m "config: add REDIS_URL and SENTRY_DSN settings"
```

---

## Task 4: Create async Redis client module

**Files:**
- Create: `backend/app/core/redis.py`

- [ ] **Step 1: Write the Redis client module**

```python
"""
Async Redis client — connection pool, health check, graceful shutdown.
"""
import redis.asyncio as aioredis
import structlog

from app.core.config import settings

logger = structlog.get_logger(__name__)

_redis: aioredis.Redis | None = None


async def connect_redis() -> None:
    """Initialize the Redis connection pool."""
    global _redis
    try:
        _redis = aioredis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=5,
        )
        await _redis.ping()
        logger.info("redis_connected", url=settings.REDIS_URL.split("@")[-1])
    except Exception:
        logger.warning("redis_unavailable", url=settings.REDIS_URL.split("@")[-1])
        _redis = None


async def disconnect_redis() -> None:
    """Close the Redis connection pool."""
    global _redis
    if _redis is not None:
        await _redis.aclose()
        _redis = None
        logger.info("redis_disconnected")


def get_redis() -> aioredis.Redis | None:
    """Return the current Redis client, or None if unavailable."""
    return _redis


async def redis_health() -> bool:
    """Check if Redis is reachable."""
    if _redis is None:
        return False
    try:
        return await _redis.ping()
    except Exception:
        return False
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/core/redis.py
git commit -m "feat: add async Redis client with health check"
```

---

## Task 5: Configure structlog

**Files:**
- Create: `backend/app/core/logging.py`

- [ ] **Step 1: Write the logging configuration module**

```python
"""
Structured logging with structlog.
JSON in production, colored console in development.
"""
import logging
import structlog

from app.core.config import settings


def setup_logging() -> None:
    """Configure structlog and stdlib logging."""
    shared_processors: list[structlog.types.Processor] = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
    ]

    if settings.APP_ENV == "production":
        renderer = structlog.processors.JSONRenderer()
    else:
        renderer = structlog.dev.ConsoleRenderer(colors=True)

    structlog.configure(
        processors=[
            *shared_processors,
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

    formatter = structlog.stdlib.ProcessorFormatter(
        processors=[
            structlog.stdlib.ProcessorFormatter.remove_processors_meta,
            renderer,
        ],
    )

    root_logger = logging.getLogger()
    root_logger.handlers.clear()
    handler = logging.StreamHandler()
    handler.setFormatter(formatter)
    root_logger.addHandler(handler)
    root_logger.setLevel(logging.INFO if settings.is_production else logging.DEBUG)

    # Silence noisy libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(
        logging.WARNING if settings.is_production else logging.INFO
    )
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/core/logging.py
git commit -m "feat: add structlog configuration (JSON prod, colored dev)"
```

---

## Task 6: Create health endpoint

**Files:**
- Create: `backend/app/routers/health.py`
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/test_health.py`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/__init__.py` (empty file).

Create `backend/tests/test_health.py`:

```python
import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app


@pytest.mark.asyncio
async def test_health_returns_200():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] in ("ok", "degraded", "down")
    assert "version" in data
    assert "db" in data
    assert "redis" in data
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/alaiinx/codigos/Algebras_modernas/Proyecto-Criptografia-Servicio-Social/backend && uv run pytest tests/test_health.py -v`
Expected: FAIL (404, endpoint does not exist yet)

- [ ] **Step 3: Write the health endpoint**

Create `backend/app/routers/health.py`:

```python
"""
Health check endpoint — reports status of DB and Redis.
"""
from fastapi import APIRouter
from sqlalchemy import text

from app.core.redis import redis_health
from app.db.session import AsyncSessionLocal

router = APIRouter(tags=["Health"])

_VERSION = "0.5.0"


@router.get("/health")
async def health_check():
    """Public health check. No auth required."""
    db_ok = await _check_db()
    redis_ok = await redis_health()

    if db_ok and redis_ok:
        status = "ok"
    elif db_ok:
        status = "degraded"
    else:
        status = "down"

    status_code = 200 if status != "down" else 503

    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=status_code,
        content={
            "status": status,
            "version": _VERSION,
            "db": db_ok,
            "redis": redis_ok,
        },
    )


async def _check_db() -> bool:
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
```

- [ ] **Step 4: Register the router in main.py**

In `backend/app/main.py`, add import:

```python
from app.routers import health
```

And add before the other router registrations (before line 174):

```python
app.include_router(health.router)
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd /home/alaiinx/codigos/Algebras_modernas/Proyecto-Criptografia-Servicio-Social/backend && uv run pytest tests/test_health.py -v`
Expected: PASS (note: DB may show false if no local PG running, but endpoint should return 200 or 503)

- [ ] **Step 6: Commit**

```bash
git add backend/app/routers/health.py backend/tests/__init__.py backend/tests/test_health.py backend/app/main.py
git commit -m "feat: add /health endpoint with DB and Redis checks"
```

---

## Task 7: Integrate structlog, Sentry, Redis, and request_id middleware into main.py

**Files:**
- Modify: `backend/app/main.py`

- [ ] **Step 1: Add imports at top of main.py**

Replace the existing imports block (lines 1-18) with:

```python
import os
import uuid
from datetime import UTC, datetime
from contextlib import asynccontextmanager

import sentry_sdk
import structlog
from fastapi import FastAPI, Request
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse as _JSONResponse
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.limiter import limiter
from app.core.logging import setup_logging
from app.core.redis import connect_redis, disconnect_redis
from app.db.ssh_manager import ssh_tunnel_manager
from app.db.session import AsyncSessionLocal
from app.db import models_import as _models  # noqa: F401
from app.models.request_metric import RequestMetric
from app.routers import auth, alumno, admin, empresa, estadisticas, system_metrics, exports, health
```

- [ ] **Step 2: Add logging setup and Sentry init before lifespan**

Add right after the imports, before the `@asynccontextmanager` line:

```python
# ── Logging & Sentry ──────────────────────────────────────────────────────────
setup_logging()
logger = structlog.get_logger("sid.main")

if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.APP_ENV,
        traces_sample_rate=0.2 if settings.is_production else 1.0,
        send_default_pii=False,
    )
```

- [ ] **Step 3: Update lifespan to include Redis and startup validation**

Replace the entire `lifespan` function with:

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown."""
    logger.info("app_starting", env=settings.APP_ENV)

    # SSH tunnel
    if settings.USE_SSH_TUNNEL:
        ssh_tunnel_manager.start()

    # Startup validation: DB
    from sqlalchemy import text
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        logger.info("db_connected")
    except Exception as exc:
        logger.error("db_connection_failed", error=str(exc))
        raise RuntimeError("Cannot start without database connection") from exc

    # Startup validation: Redis (non-fatal)
    await connect_redis()

    yield

    await disconnect_redis()

    if settings.USE_SSH_TUNNEL:
        ssh_tunnel_manager.stop()

    logger.info("app_stopped")
```

- [ ] **Step 4: Add request_id middleware**

Add after the `security_headers_middleware` and before `request_metrics_middleware`:

```python
@app.middleware("http")
async def request_id_middleware(request: Request, call_next) -> Response:
    """Inject a unique request ID into every request/response."""
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    request.state.request_id = request_id
    structlog.contextvars.clear_contextvars()
    structlog.contextvars.bind_contextvars(request_id=request_id)
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response
```

- [ ] **Step 5: Replace print statements in main.py**

Any remaining `print(...)` calls should already be replaced by the lifespan changes. Verify no `print()` calls remain in the file.

- [ ] **Step 6: Register health router**

Ensure this line exists before other routers (should already be done in Task 6):

```python
app.include_router(health.router)
```

- [ ] **Step 7: Verify the app starts**

Run: `cd /home/alaiinx/codigos/Algebras_modernas/Proyecto-Criptografia-Servicio-Social/backend && uv run python -c "from app.main import app; print('OK')"` 
Expected: `OK` (or structlog output + OK)

- [ ] **Step 8: Commit**

```bash
git add backend/app/main.py
git commit -m "feat: integrate structlog, Sentry, Redis lifecycle, and request_id middleware"
```

---

## Task 8: Fix Dockerfile Python version

**Files:**
- Modify: `Dockerfile`

- [ ] **Step 1: Update Python image version**

On line 18, change:

```dockerfile
FROM python:3.11-slim
```

to:

```dockerfile
FROM python:3.12-slim
```

- [ ] **Step 2: Verify Dockerfile builds**

Run: `cd /home/alaiinx/codigos/Algebras_modernas/Proyecto-Criptografia-Servicio-Social && docker build --target frontend-builder -t sid-test-build .` (quick validation of first stage)
Expected: builds without errors

- [ ] **Step 3: Commit**

```bash
git add Dockerfile
git commit -m "fix: update Dockerfile to Python 3.12 (matches pyproject.toml)"
```

---

## Task 9: Setup pytest infrastructure

**Files:**
- Create: `backend/tests/conftest.py`
- Modify: `backend/pyproject.toml` (add pytest config)

- [ ] **Step 1: Add pytest config to pyproject.toml**

Add at the end of `pyproject.toml`:

```toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
```

- [ ] **Step 2: Write conftest.py with core fixtures**

Create `backend/tests/conftest.py`:

```python
"""
Shared pytest fixtures for the SID backend test suite.
"""
import asyncio
from collections.abc import AsyncGenerator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.db.session import get_db
from app.main import app

# ── In-memory SQLite for tests ────────────────────────────────────────────────

TEST_DATABASE_URL = "sqlite+aiosqlite://"

test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestSessionLocal = async_sessionmaker(
    bind=test_engine, class_=AsyncSession, expire_on_commit=False
)


@pytest.fixture(scope="session")
def event_loop():
    """Single event loop for the entire test session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(autouse=True)
async def setup_db():
    """Create all tables before each test, drop after."""
    from app.db.models_import import Base  # noqa: F401
    from sqlalchemy import event

    # SQLite does not enforce FK by default; enable it
    @event.listens_for(test_engine.sync_engine, "connect")
    def set_sqlite_pragma(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Provide a test database session."""
    async with TestSessionLocal() as session:
        yield session


async def _override_get_db():
    async with TestSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise


@pytest.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """HTTP client with DB dependency overridden."""
    app.dependency_overrides[get_db] = _override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def auth_headers():
    """Factory fixture: returns Authorization headers for a given role."""
    from app.core.security import create_access_token

    def _make(matricula: str = "A00000001", role: str = "alumno", nombre: str = "Test User"):
        token = create_access_token({"sub": matricula, "rol": role, "nombre": nombre})
        return {"Authorization": f"Bearer {token}"}

    return _make
```

- [ ] **Step 3: Check that the Base import works**

The conftest imports `Base` from `app.db.models_import`. Verify this file exports `Base`:

Run: `cd /home/alaiinx/codigos/Algebras_modernas/Proyecto-Criptografia-Servicio-Social/backend && uv run python -c "from app.db.models_import import Base; print('OK')"`
Expected: `OK`

If it fails, check how Base is defined (likely in `app/db/base.py` or similar) and adjust the import.

- [ ] **Step 4: Run existing test to validate setup**

Run: `cd /home/alaiinx/codigos/Algebras_modernas/Proyecto-Criptografia-Servicio-Social/backend && uv run pytest tests/test_health.py -v`
Expected: test_health_returns_200 PASS (now using the test DB fixture)

- [ ] **Step 5: Commit**

```bash
git add backend/tests/conftest.py backend/pyproject.toml
git commit -m "test: setup pytest with async SQLite fixtures and test client"
```

---

## Task 10: Setup Vitest for frontend

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/vitest.config.js`
- Create: `frontend/src/test/setup.js`
- Create: `frontend/src/test/example.test.jsx`

- [ ] **Step 1: Install vitest and testing-library**

Run:
```bash
cd /home/alaiinx/codigos/Algebras_modernas/Proyecto-Criptografia-Servicio-Social/frontend && npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 2: Add test scripts to package.json**

Add to the `"scripts"` section:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

- [ ] **Step 3: Create vitest.config.js**

```javascript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.js"],
    css: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 4: Create test setup file**

Create `frontend/src/test/setup.js`:

```javascript
import "@testing-library/jest-dom";

// Mock fetch globally
globalThis.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  })
);
```

- [ ] **Step 5: Write a smoke test**

Create `frontend/src/test/example.test.jsx`:

```jsx
import { describe, it, expect } from "vitest";

describe("vitest setup", () => {
  it("runs a basic assertion", () => {
    expect(1 + 1).toBe(2);
  });

  it("has jsdom environment", () => {
    expect(document).toBeDefined();
    expect(document.createElement("div")).toBeTruthy();
  });
});
```

- [ ] **Step 6: Run tests**

Run: `cd /home/alaiinx/codigos/Algebras_modernas/Proyecto-Criptografia-Servicio-Social/frontend && npm test`
Expected: 2 tests pass

- [ ] **Step 7: Commit**

```bash
git add frontend/vitest.config.js frontend/src/test/setup.js frontend/src/test/example.test.jsx frontend/package.json frontend/package-lock.json
git commit -m "test: setup Vitest with jsdom and testing-library"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Redis in docker-compose | docker-compose.yml |
| 2 | Add dependencies | backend/pyproject.toml |
| 3 | Config settings | backend/app/core/config.py |
| 4 | Redis client module | backend/app/core/redis.py |
| 5 | Structlog config | backend/app/core/logging.py |
| 6 | Health endpoint + test | backend/app/routers/health.py, tests/test_health.py |
| 7 | Integrate into main.py | backend/app/main.py |
| 8 | Fix Dockerfile | Dockerfile |
| 9 | Pytest setup | backend/tests/conftest.py |
| 10 | Vitest setup | frontend/vitest.config.js, src/test/* |

**Dependencies:** Tasks 1-5 are independent. Task 6 depends on 4 (redis_health import). Task 7 depends on 4, 5, 6. Tasks 8-10 are independent of each other and of 1-7.
