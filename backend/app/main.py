from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.core.config import settings
from app.routers import auth


# ── Rate Limiting ─────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Eventos de inicio y cierre de la aplicación."""
    print(f"🚀 SID Backend iniciando en modo: {settings.APP_ENV}")
    yield
    print("🛑 SID Backend cerrando...")


app = FastAPI(
    title="SID — Sistema de Inscripción Dinámica",
    description="API para el sistema de pre-registro e inscripción con QR dinámico",
    version="0.2.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

# ── Security Headers Middleware ────────────────────────────────────────────────
@app.middleware("http")
async def security_headers_middleware(request: Request, call_next) -> Response:
    """
    Agrega HTTP Security Headers a cada respuesta.
    Estos headers protegen al browser del usuario contra ataques comunes.
    """
    response = await call_next(request)

    # Evita que el browser ejecute scripts inline no autorizados (XSS)
    # 'self': solo scripts del mismo origen
    # 'unsafe-inline': necesario solo para Tailwind en desarrollo; quitar en prod
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com; "
        "style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "img-src 'self' data:; "
        "connect-src 'self';"
    )
    # Evita que el sitio sea embebido en un iframe (Clickjacking)
    response.headers["X-Frame-Options"] = "DENY"

    # Evita que el browser adivine el content-type (MIME sniffing)
    response.headers["X-Content-Type-Options"] = "nosniff"

    # Controla cuánta info del referrer se manda a otros sitios
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

    # En producción activar HSTS (fuerza HTTPS). En dev se omite para no romper localhost.
    if not settings.DEBUG:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

    # Deshabilita features de browser que no necesitamos (geolocation, camera, etc.)
    response.headers["Permissions-Policy"] = (
        "geolocation=(), camera=(), microphone=(), payment=()"
    )

    # Cache: no guardar páginas autenticadas en caché del browser
    if request.url.path in ("/dashboard", "/login", "/registro"):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
        response.headers["Pragma"] = "no-cache"

    return response


# Rate limiter state + handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Archivos estáticos (CSS, JS)
app.mount("/static", StaticFiles(directory="app/static"), name="static")

# Routers
app.include_router(auth.router, tags=["Autenticación"])

templates = Jinja2Templates(directory="app/templates")


@app.get("/", include_in_schema=False)
async def root():
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="/registro")


@app.get("/dashboard", response_class=HTMLResponse, include_in_schema=False)
async def dashboard(request: Request):
    """Dashboard placeholder — se completa en Etapa 3."""
    return templates.TemplateResponse("dashboard.html", {"request": request})
