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
from app.db import models_import as _models  # noqa: F401 — carga todos los modelos para SQLAlchemy
from app.models.request_metric import RequestMetric
from app.routers import auth, alumno, admin, empresa, estadisticas, system_metrics, exports, health

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

# ── Rate Limiting (importado desde app.core.limiter) ─────────────────────────


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


app = FastAPI(
    title="SID — Sistema de Inscripción Dinámica",
    description="API para el sistema de pre-registro e inscripción con QR dinámico",
    version="0.5.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

# ── CORS Middleware ────────────────────────────────────────────────────────────
# En desarrollo: acepta cualquier origen en red privada local (LAN) para
# poder probar desde celular u otras máquinas sin hardcodear IPs.
# En producción: solo los orígenes de settings.ALLOWED_ORIGINS.
_LOCAL_ORIGIN_REGEX = (
    r"http://(localhost|127\.0\.0\.1"
    r"|192\.168\.\d{1,3}\.\d{1,3}"
    r"|10\.\d{1,3}\.\d{1,3}\.\d{1,3}"
    r"|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}"
    r"):(5173|4173|3000|8080)"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_origin_regex=_LOCAL_ORIGIN_REGEX if settings.APP_ENV == "development" else None,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# ── Security Headers Middleware ────────────────────────────────────────────────
@app.middleware("http")
async def security_headers_middleware(request: Request, call_next) -> Response:
    """
    Agrega HTTP Security Headers a cada respuesta.
    Estos headers protegen al browser del usuario contra ataques comunes.
    """
    response = await call_next(request)

    if settings.DEBUG:
        csp = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net https://unpkg.com https://accounts.google.com; "
            "style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://fonts.googleapis.com https://accounts.google.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: https://*.googleusercontent.com; "
            "connect-src 'self' http://localhost:8000 https://accounts.google.com; "
            "frame-src 'self' https://accounts.google.com;"
        )
    else:
        csp = (
            "default-src 'self'; "
            "script-src 'self' https://accounts.google.com; "
            "style-src 'self' https://fonts.googleapis.com https://accounts.google.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: https://*.googleusercontent.com; "
            "connect-src 'self' https://accounts.google.com; "
            "frame-src 'self' https://accounts.google.com;"
        )
    response.headers["Content-Security-Policy"] = csp
    # Permitir que Google monte su iframe invisible
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer-when-downgrade"
    # COOP en unsafe-none es requerido por Google Identity Services (GSI)
    response.headers["Cross-Origin-Opener-Policy"] = "unsafe-none"

    if not settings.DEBUG:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

    # Permitir cámara solo en la ruta del escáner; bloquearla en el resto
    if request.url.path.startswith("/empresa/escaner"):
        response.headers["Permissions-Policy"] = (
            "geolocation=(), camera=(self), microphone=(), payment=()"
        )
    else:
        response.headers["Permissions-Policy"] = (
            "geolocation=(), camera=(), microphone=(), payment=()"
        )

    if request.url.path.startswith("/api/") or request.url.path in ("/dashboard", "/login", "/registro"):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
        response.headers["Pragma"] = "no-cache"

    return response


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


@app.middleware("http")
async def request_metrics_middleware(request: Request, call_next) -> Response:
    started_at = datetime.now(UTC)
    status_code = 500

    try:
        response = await call_next(request)
        status_code = response.status_code
        return response
    finally:
        if request.url.path.startswith("/api/"):
            ended_at = datetime.now(UTC)
            duration_ms = max((ended_at - started_at).total_seconds() * 1000, 0.0)

            async with AsyncSessionLocal() as session:
                try:
                    session.add(
                        RequestMetric(
                            request_timestamp=started_at,
                            endpoint=request.url.path[:255],
                            method=request.method,
                            status_code=int(status_code),
                            duration_ms=round(duration_ms, 3),
                        )
                    )
                    await session.commit()
                except Exception:
                    await session.rollback()


# ── Rate Limiter ───────────────────────────────────────────────────────────────
app.state.limiter = limiter
async def _custom_rate_limit_handler(request: Request, exc: RateLimitExceeded):
    window = exc.limit.limit.get_expiry() if exc.limit else 60
    minutes = max(1, window // 60)
    return _JSONResponse(
        status_code=429,
        content={"detail": f"Demasiados intentos. Inténtelo de nuevo en {minutes} minuto(s)."},
        headers={"Retry-After": str(window)},
    )

app.add_exception_handler(RateLimitExceeded, _custom_rate_limit_handler)



# Routers
app.include_router(health.router)
app.include_router(auth.router, tags=["Autenticación"])
app.include_router(alumno.router, tags=["Alumno"])
app.include_router(admin.router, tags=["Admin"])
app.include_router(empresa.router, tags=["Empresa"])
app.include_router(estadisticas.router, tags=["Estadisticas"])
app.include_router(system_metrics.router, tags=["Sistema"])
app.include_router(exports.router, tags=["Export"])

# Servir Frontend compilado (React SPA) en la raíz
frontend_dist = os.path.join(os.path.dirname(__file__), "../../frontend/dist")
if os.path.exists(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")
else:
    @app.get("/", include_in_schema=False)
    async def root():
        return {"message": "API Activa. Frontend de React no encontrado en /frontend/dist."}
