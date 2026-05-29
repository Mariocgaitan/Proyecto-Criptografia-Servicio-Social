"""
Middlewares de seguridad — headers HTTP defensivos.

Implementa un middleware ASGI que añade headers de seguridad estándar a
todas las respuestas. Los valores del CSP difieren entre desarrollo y
producción para permitir el HMR de Vite en dev sin abrir agujeros en prod.

Uso:
    from core_access_engine.middleware import add_security_headers_middleware

    app = FastAPI(...)
    add_security_headers_middleware(
        app,
        app_env="production",
        camera_scan_path="/empresa/escaner",   # ruta donde se permite cámara
        csp_production="default-src 'self'; ...",  # override opcional
    )

Headers aplicados:
  - Strict-Transport-Security (HSTS) — solo en producción
  - X-Frame-Options
  - X-Content-Type-Options
  - Referrer-Policy
  - Cross-Origin-Opener-Policy
  - Permissions-Policy (con/sin cámara según la ruta)
  - Cache-Control (no-store en rutas de API y dashboards)
  - Content-Security-Policy
"""

from __future__ import annotations
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from fastapi import FastAPI

__all__ = ["add_security_headers_middleware"]

# CSP permisiva para desarrollo (permite Vite HMR, Tailwind CDN, etc.)
_CSP_DEVELOPMENT = (
    "default-src 'self'; "
    "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net "
    "https://unpkg.com https://accounts.google.com https://static.cloudflareinsights.com; "
    "script-src-elem 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net "
    "https://unpkg.com https://accounts.google.com https://static.cloudflareinsights.com; "
    "style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://fonts.googleapis.com "
    "https://accounts.google.com; "
    "style-src-elem 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://fonts.googleapis.com "
    "https://accounts.google.com; "
    "font-src 'self' https://fonts.gstatic.com; "
    "img-src 'self' data: https://*.googleusercontent.com; "
    "connect-src 'self' http://localhost:8000 https://accounts.google.com "
    "https://static.cloudflareinsights.com; "
    "frame-src 'self' https://accounts.google.com;"
)

# CSP estricta para producción (sin unsafe-inline en scripts).
# RECOMENDADO: sobreescribir con el hash SHA-256 del script inline de tu app.
_CSP_PRODUCTION = (
    "default-src 'self'; "
    "script-src 'self' https://accounts.google.com https://static.cloudflareinsights.com; "
    "script-src-elem 'self' https://accounts.google.com https://static.cloudflareinsights.com; "
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com; "
    "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com; "
    "font-src 'self' https://fonts.gstatic.com; "
    "img-src 'self' data: https://*.googleusercontent.com; "
    "connect-src 'self' https://accounts.google.com https://static.cloudflareinsights.com; "
    "frame-src 'self' https://accounts.google.com;"
)

_NO_CACHE_PREFIXES = ("/api/",)
_NO_CACHE_PATHS = ("/dashboard", "/login", "/registro")


def add_security_headers_middleware(
    app: "FastAPI",
    app_env: str = "development",
    camera_scan_path: str = "/empresa/escaner",
    csp_development: str | None = None,
    csp_production: str | None = None,
) -> None:
    """
    Registra el middleware de headers de seguridad en la app FastAPI.

    Args:
        app:              Instancia de FastAPI de la app consumidora.
        app_env:          Entorno de ejecución. "production" activa HSTS y CSP estricto.
        camera_scan_path: Prefijo de ruta donde se permite acceso a la cámara del
                          dispositivo vía Permissions-Policy. Pasar None para
                          deshabilitar cámara en todas las rutas.
        csp_development:  CSP personalizado para entorno dev (override).
        csp_production:   CSP personalizado para entorno prod (override).
                          RECOMENDADO: incluir el hash SHA-256 del script inline.
    """
    from starlette.requests import Request
    from starlette.responses import Response

    is_production = app_env == "production"
    _csp_dev = csp_development or _CSP_DEVELOPMENT
    _csp_prod = csp_production or _CSP_PRODUCTION

    @app.middleware("http")
    async def _security_headers(request: Request, call_next) -> Response:
        response = await call_next(request)

        response.headers["Content-Security-Policy"] = _csp_prod if is_production else _csp_dev
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer-when-downgrade"
        # COOP en unsafe-none es requerido por Google Identity Services (GSI)
        response.headers["Cross-Origin-Opener-Policy"] = "unsafe-none"

        if is_production:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        if camera_scan_path and request.url.path.startswith(camera_scan_path):
            response.headers["Permissions-Policy"] = (
                "geolocation=(), camera=(self), microphone=(), payment=()"
            )
        else:
            response.headers["Permissions-Policy"] = (
                "geolocation=(), camera=(), microphone=(), payment=()"
            )

        path = request.url.path
        if any(path.startswith(p) for p in _NO_CACHE_PREFIXES) or path in _NO_CACHE_PATHS:
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
            response.headers["Pragma"] = "no-cache"

        return response
