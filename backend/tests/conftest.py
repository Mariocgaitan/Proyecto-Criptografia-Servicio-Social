"""
Shared pytest fixtures for the Feria Servicio Social backend test suite.

Environment variables are set BEFORE any app imports to satisfy
pydantic-settings validation in app.core.config.Settings.
"""
from __future__ import annotations

import os

# ── Env vars required by Settings (must be set before importing anything from app) ──
from cryptography.fernet import Fernet as _Fernet

_fernet_key = _Fernet.generate_key().decode()

_TEST_ENV = {
    # Use a PostgreSQL URL so app.db.session module can create its engine
    # with pool_size/max_overflow (incompatible with SQLite).  The engine is
    # never actually used — we override get_db with an in-memory SQLite session.
    "DATABASE_URL": "postgresql+asyncpg://test:test@localhost:5432/test_db",
    "USE_SSH_TUNNEL": "false",
    "SSH_HOST": "localhost",
    "SSH_PORT": "22",
    "SSH_USER": "test",
    "SSH_PKEY_PATH": "/dev/null",
    "REMOTE_DB_HOST": "localhost",
    "REMOTE_DB_PORT": "5432",
    "LOCAL_BIND_PORT": "15432",
    "JWT_SECRET_KEY": "test-jwt-secret-key-that-is-long-enough-for-validation",
    "QR_ENCRYPTION_KEY": _fernet_key,
    "JWT_ALGORITHM": "HS256",
    "ACCESS_TOKEN_EXPIRE_MINUTES": "30",
    "REFRESH_TOKEN_EXPIRE_HOURS": "24",
    "PRE_AUTH_TOKEN_EXPIRE_MINUTES": "10",
    "GOOGLE_CLIENT_ID": "fake-google-client-id.apps.googleusercontent.com",
    "SMTP_HOST": "smtp.example.com",
    "SMTP_PORT": "587",
    "SMTP_USER": "test@example.com",
    "SMTP_PASSWORD": "fake-smtp-password",
    "SMTP_FROM_EMAIL": "noreply@example.com",
    "APP_ENV": "development",
    "DEBUG": "true",
    "SHOW_DOCS": "true",
    "TEST_ROLE_SWITCH_ENABLED": "false",
    "TEST_ROLE_SWITCH_EMAIL": "",
    "TEST_ROLE_SWITCH_ROLE": "",
    "ALLOWED_ORIGINS": "[]",
    "USE_HTTPS": "false",
    "SSL_CERTFILE": "",
    "SSL_KEYFILE": "",
    "MAX_FAILED_LOGIN_ATTEMPTS": "5",
    "LOCKOUT_DURATION_MINUTES": "15",
    "REDIS_URL": "redis://localhost:6379/0",
}

for key, value in _TEST_ENV.items():
    os.environ.setdefault(key, value)

# ── Now safe to import from app ─────────────────────────────────────────────────
from collections.abc import AsyncGenerator
from typing import Any

import fakeredis.aioredis
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token, hash_password
from app.db import models_import as _models  # noqa: F401 — register all models
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.empresa import Empresa
from app.models.evento import Evento
from app.models.padron_alumno import PadronAlumno
from app.models.proyecto import Proyecto
from app.models.usuario import Usuario
from app.models.usuario_evento import UsuarioEvento


# ── In-memory SQLite engine (session scope) ──────────────────────────────────────

@pytest.fixture(scope="session")
def db_engine():
    """
    Create a single SQLite async in-memory engine shared across all tests
    in the session.  StaticPool keeps the same in-memory DB alive.
    """
    engine = create_async_engine(
        "sqlite+aiosqlite://",
        echo=False,
        poolclass=StaticPool,
        connect_args={"check_same_thread": False},
    )
    return engine


@pytest.fixture(autouse=True)
async def _setup_tables(db_engine):
    """Create all tables before each test, drop them after."""
    async with db_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with db_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


# ── DB session (function scope) ──────────────────────────────────────────────────

@pytest.fixture
async def db_session(db_engine) -> AsyncGenerator[AsyncSession, None]:
    """Provide a test database session and override the FastAPI dependency."""
    _TestSessionLocal = async_sessionmaker(
        bind=db_engine, class_=AsyncSession, expire_on_commit=False,
    )

    async def _override_get_db():
        async with _TestSessionLocal() as session:
            try:
                yield session
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_db] = _override_get_db

    async with _TestSessionLocal() as session:
        yield session

    app.dependency_overrides.pop(get_db, None)


# ── HTTP client (function scope) ─────────────────────────────────────────────────

@pytest.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """
    httpx AsyncClient with ASGITransport wrapping the FastAPI app.
    Patches the Redis module with fakeredis so cache operations work
    without a real Redis server.
    """
    import app.core.redis as redis_module

    fake_redis = fakeredis.aioredis.FakeRedis(decode_responses=True)
    original_redis = redis_module._redis
    redis_module._redis = fake_redis

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c

    redis_module._redis = original_redis
    await fake_redis.aclose()


# ── Auth cookies factory ─────────────────────────────────────────────────────────

@pytest.fixture
def auth_cookies(db_session: AsyncSession):
    """
    Async factory that creates a user in the DB and returns a cookie dict
    with the JWT access_token suitable for passing to httpx requests.

    Usage:
        cookies = await auth_cookies("alumno")
        cookies = await auth_cookies("admin", matricula="ADM001")
        response = await client.get("/api/...", cookies=cookies)
    """
    _counter = 0

    async def _factory(
        role: str,
        matricula: str | None = None,
    ) -> dict[str, str]:
        nonlocal _counter
        _counter += 1

        if matricula is None:
            matricula = f"TEST{_counter:05d}"

        user = Usuario(
            id_matricula=matricula,
            nombre=f"Test {role.capitalize()} {_counter}",
            correo=f"test_{role}_{_counter}@tec.mx",
            carrera="ITC",
            semestre=6,
            password_hash=hash_password("Test1234!"),
            is_google_login=False,
            totp_secret="JBSWY3DPEHPK3PXP",
            rol=role,
        )
        db_session.add(user)
        await db_session.commit()

        token = create_access_token({"sub": matricula, "rol": role, "nombre": user.nombre})
        return {"access_token": token}

    return _factory


# ── Sample data ──────────────────────────────────────────────────────────────────

@pytest.fixture
async def sample_data(db_session: AsyncSession) -> dict[str, Any]:
    """
    Seed the DB with a representative set of related entities and return
    them as a dict for easy access in tests.

    Keys: evento, empresa, proyecto, alumno, admin, empresa_user,
          usuario_evento, padron_alumno
    """
    # Evento
    evento = Evento(
        nombre="Vinculacion 2026",
        periodo="FEB_JUN",
        anio=2026,
        activo=True,
        iniciado=True,
    )
    db_session.add(evento)
    await db_session.flush()

    # Empresa
    empresa = Empresa(nombre_empresa="Acme Corp")
    db_session.add(empresa)
    await db_session.flush()

    # Proyecto
    proyecto = Proyecto(
        id_empresa=empresa.id_empresa,
        id_evento=evento.id_evento,
        nombre_proyecto="Proyecto Alpha",
        descripcion="Descripcion del proyecto alpha",
        capacidad_max=30,
        cupo_actual=0,
    )
    db_session.add(proyecto)
    await db_session.flush()

    # Alumno
    alumno = Usuario(
        id_matricula="A01000001",
        nombre="Alumno Test",
        correo="alumno@tec.mx",
        carrera="ITC",
        semestre=6,
        password_hash=hash_password("Test1234!"),
        is_google_login=False,
        totp_secret="JBSWY3DPEHPK3PXP",
        rol="alumno",
        id_proyecto=proyecto.id_proyecto,
    )
    db_session.add(alumno)

    # Admin
    admin = Usuario(
        id_matricula="ADM000001",
        nombre="Admin Test",
        correo="admin@tec.mx",
        carrera="ADM",
        semestre=1,
        password_hash=hash_password("Admin1234!"),
        is_google_login=False,
        totp_secret="JBSWY3DPEHPK3PXP",
        rol="admin",
    )
    db_session.add(admin)

    # Empresa user
    empresa_user = Usuario(
        id_matricula="EMP000001",
        nombre="Empresa User Test",
        correo="empresa@acme.com",
        carrera="N/A",
        semestre=0,
        password_hash=hash_password("Test1234!"),
        is_google_login=False,
        totp_secret="JBSWY3DPEHPK3PXP",
        rol="empresa",
        id_empresa=empresa.id_empresa,
    )
    db_session.add(empresa_user)
    await db_session.flush()

    # UsuarioEvento (pivot)
    usuario_evento = UsuarioEvento(
        id_matricula=alumno.id_matricula,
        id_evento=evento.id_evento,
        es_participante=True,
    )
    db_session.add(usuario_evento)

    # PadronAlumno
    padron_alumno = PadronAlumno(
        id_matricula="A01000001",
        nombre_completo="Alumno Test",
        carrera="ITC",
        semestre=6,
    )
    db_session.add(padron_alumno)

    await db_session.commit()

    return {
        "evento": evento,
        "empresa": empresa,
        "proyecto": proyecto,
        "alumno": alumno,
        "admin": admin,
        "empresa_user": empresa_user,
        "usuario_evento": usuario_evento,
        "padron_alumno": padron_alumno,
    }
