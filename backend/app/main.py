from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.limiter import limiter
from app.db.ssh_manager import ssh_tunnel_manager
from app.db import models_import as _models  # noqa: F401 — carga todos los modelos para SQLAlchemy
from app.routers import auth, alumno, admin, empresa


# ── Rate Limiting (importado desde app.core.limiter) ─────────────────────────


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Eventos de inicio y cierre de la aplicación."""
    print(f"🚀 SID Backend iniciando en modo: {settings.APP_ENV}")
    
    # Iniciar túnel SSH si está habilitado
    if settings.USE_SSH_TUNNEL:
        ssh_tunnel_manager.start()
        
    yield
    
    # Cerrar túnel SSH si está activo
    if settings.USE_SSH_TUNNEL:
        ssh_tunnel_manager.stop()
        
    print("🛑 SID Backend cerrando...")


app = FastAPI(
    title="SID — Sistema de Inscripción Dinámica",
    description="API para el sistema de pre-registro e inscripción con QR dinámico",
    version="0.5.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

# ── CORS Middleware ────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Security Headers Middleware ────────────────────────────────────────────────
@app.middleware("http")
async def security_headers_middleware(request: Request, call_next) -> Response:
    """
    Agrega HTTP Security Headers a cada respuesta.
    Estos headers protegen al browser del usuario contra ataques comunes.
    """
    response = await call_next(request)

    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net https://unpkg.com; "
        "style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "img-src 'self' data:; "
        "connect-src 'self';"
    )
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

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

    if request.url.path in ("/dashboard", "/login", "/registro"):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
        response.headers["Pragma"] = "no-cache"

    return response


# ── Rate Limiter ───────────────────────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Archivos estáticos heredados (si hay imágenes/assets puros del backend)
import os
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory="app/static"), name="static")

# Routers
app.include_router(auth.router, tags=["Autenticación"])
app.include_router(alumno.router, tags=["Alumno"])
app.include_router(admin.router, tags=["Admin"])
app.include_router(empresa.router, tags=["Empresa"])

# Servir Frontend compilado (React SPA) en la raíz
frontend_dist = os.path.join(os.path.dirname(__file__), "../../frontend/dist")
if os.path.exists(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")
else:
    @app.get("/", include_in_schema=False)
    async def root():
        return {"message": "API Activa. Frontend de React no encontrado en /frontend/dist."}
