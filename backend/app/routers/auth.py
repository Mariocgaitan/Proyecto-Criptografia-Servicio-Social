from fastapi import APIRouter, Cookie, Depends, Request
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.config import settings
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    GoogleAuthRequest,
    PreAuthResponse,
    VerifyTOTPRequest,
    RoleRedirectResponse,
)
from app.schemas.usuario import RegistroRequest
from app.services.auth_service import (
    LoginError,
    RegistroError,
    obtener_carreras_disponibles,
    login_alumno,
    logout_alumno,
    obtener_eventos_disponibles,
    refresh_session,
    registrar_alumno,
    login_or_register_google,
    verify_totp_and_get_token,
)
from app.core.limiter import limiter


router = APIRouter()

# Duración cookie refresh token en segundos (8 horas)
REFRESH_COOKIE_MAX_AGE = 8 * 60 * 60
ACCESS_COOKIE_MAX_AGE = 15 * 60


def _set_auth_cookies(response: JSONResponse, access_token: str, raw_refresh: str) -> None:
    """Set both access and refresh token cookies on the response."""
    response.set_cookie(
        key="refresh_token",
        value=raw_refresh,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="strict",
        max_age=REFRESH_COOKIE_MAX_AGE,
    )
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="strict",
        max_age=ACCESS_COOKIE_MAX_AGE,
    )


def _set_access_cookie(response: JSONResponse, access_token: str) -> None:
    """Set only the access token cookie on the response (used by refresh endpoint)."""
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="strict",
        max_age=ACCESS_COOKIE_MAX_AGE,
    )


@router.post("/api/v1/auth/registro", status_code=201, tags=["Autenticación"], summary="Registrar alumno")
@limiter.limit("5/minute")
async def api_registro(request: Request, datos: RegistroRequest, db: AsyncSession = Depends(get_db)):
    try:
        return await registrar_alumno(db, datos)
    except RegistroError as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.get("/api/v1/auth/eventos", tags=["Autenticación"], summary="Obtener eventos disponibles para registro")
async def api_eventos_disponibles(db: AsyncSession = Depends(get_db)):
    """Retorna la lista de eventos que pueden seleccionarse en el formulario de registro."""
    return await obtener_eventos_disponibles(db)


@router.get("/api/v1/auth/carreras", tags=["Autenticación"], summary="Obtener carreras disponibles para registro")
async def api_carreras_disponibles():
    """Retorna el catálogo oficial de carreras para el formulario de registro."""
    return obtener_carreras_disponibles()


@router.post("/api/v1/auth/login", response_model=TokenResponse, tags=["Autenticación"], summary="Iniciar sesión")
@limiter.limit("10/minute")
async def api_login(request: Request, datos: LoginRequest, db: AsyncSession = Depends(get_db)):
    ip = request.client.host if request.client else None
    try:
        access_token, raw_refresh = await login_alumno(db, datos.correo, datos.password, ip)
    except LoginError as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=e.status_code, detail=e.message)

    response = JSONResponse(content={"access_token": access_token, "token_type": "bearer"})
    _set_auth_cookies(response, access_token, raw_refresh)
    return response


@router.post("/api/v1/auth/refresh", response_model=TokenResponse, tags=["Autenticación"], summary="Renovar access token")
@limiter.limit("30/minute")
async def api_refresh(
    request: Request,
    db: AsyncSession = Depends(get_db),
    refresh_token: str | None = Cookie(default=None),
):
    from fastapi import HTTPException
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token no encontrado")
    try:
        new_token = await refresh_session(db, refresh_token)
        response = JSONResponse(content={"access_token": new_token, "token_type": "bearer"})
        _set_access_cookie(response, new_token)
        return response
    except LoginError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.post("/api/v1/auth/logout", tags=["Autenticación"], summary="Cerrar sesión")
async def api_logout(
    db: AsyncSession = Depends(get_db),
    refresh_token: str | None = Cookie(default=None),
):
    if refresh_token:
        await logout_alumno(db, refresh_token)
    response = JSONResponse(content={"message": "Sesión cerrada exitosamente"})
    response.delete_cookie("refresh_token")
    response.delete_cookie("access_token")
    return response


@router.get("/api/v1/auth/me", tags=["Autenticación"], summary="Obtener usuario actual")
async def api_me(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    from app.core.dependencies import get_current_user
    user = await get_current_user(request, db)
    return {
        "id_matricula": user.id_matricula,
        "nombre": user.nombre,
        "correo": user.correo,
        "carrera": user.carrera,
        "semestre": user.semestre,
        "rol": user.rol,
        "id_proyecto": getattr(user, "id_proyecto", None)
    }


# ── Google OAuth ──────────────────────────────────────────────────────────────

@router.post("/api/v1/auth/google", response_model=PreAuthResponse, tags=["Autenticación"], summary="Iniciar sesión con Google")
@limiter.limit("10/minute")
async def api_google_auth(
    datos: GoogleAuthRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Autentica con Google. Si es válido, retorna temp_token que requiere TOTP.
    Si es primera vez, incluye QR code para vincular Authenticator.
    """
    from fastapi import HTTPException
    ip = request.client.host if request.client else None

    try:
        temp_token, totp_qr = await login_or_register_google(db, datos.id_token, ip)
        return PreAuthResponse(
            status="requires_2fa",
            temp_token=temp_token,
            totp_qr_code=totp_qr,
        )
    except LoginError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.post("/api/v1/auth/verify-totp", response_model=RoleRedirectResponse, tags=["Autenticación"], summary="Verificar TOTP y obtener token final")
@limiter.limit("5/minute")
async def api_verify_totp(
    datos: VerifyTOTPRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Verifica el código TOTP usando el temp_token del pre-auth.
    Si es válido, retorna access_token, rol y URL de redirección.
    """
    from fastapi import HTTPException
    ip = request.client.host if request.client else None

    try:
        access_token, raw_refresh, rol, redirect_url = await verify_totp_and_get_token(
            db, datos.temp_token, datos.totp_code, ip
        )

        response = JSONResponse(content={
            "access_token": access_token,
            "token_type": "bearer",
            "rol": rol,
            "redirect_url": redirect_url,
        })

        # Guardar refresh token en cookie
        _set_auth_cookies(response, access_token, raw_refresh)
        return response
    except LoginError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
