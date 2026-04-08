from fastapi import APIRouter, Cookie, Depends, Request
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.config import settings
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    GoogleAuthRequest,
    GoogleNonceResponse,
    PreAuthResponse,
    VerifyTOTPRequest,
    RoleRedirectResponse,
    CompleteProfileRequest,
)
from app.services.auth_service import (
    LoginError,
    login_alumno,
    logout_alumno,
    refresh_session,
    login_or_register_google,
    verify_totp_and_get_token,
    generate_and_store_nonce,
)
from app.core.limiter import limiter


router = APIRouter()

# Duración cookies según configuración
REFRESH_COOKIE_MAX_AGE = settings.REFRESH_TOKEN_EXPIRE_HOURS * 60 * 60
ACCESS_COOKIE_MAX_AGE = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60


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



@router.post("/api/v1/auth/complete-profile", tags=["Autenticación"], summary="Completar perfil de nuevo usuario")
async def api_complete_profile(
    datos: CompleteProfileRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    from fastapi import HTTPException
    from sqlalchemy import select
    from app.core.dependencies import get_current_user
    from app.models.evento import Evento
    from app.models.usuario_evento import UsuarioEvento

    user = await get_current_user(request, db)

    if datos.carrera is not None:
        user.carrera = datos.carrera
    if datos.semestre is not None:
        user.semestre = datos.semestre


    result = await db.execute(
        select(Evento).where(Evento.periodo == datos.periodo).order_by(Evento.id_evento.desc())
    )
    evento = result.scalars().first()
    
    if evento:
        check = await db.execute(select(UsuarioEvento).where(
            UsuarioEvento.id_matricula == user.id_matricula,
            UsuarioEvento.id_evento == evento.id_evento
        ))
        if not check.scalar_one_or_none():
            db.add(UsuarioEvento(id_matricula=user.id_matricula, id_evento=evento.id_evento))
            
    await db.commit()
    return {"message": "Perfil actualizado exitosamente"}


# ── Google OAuth ──────────────────────────────────────────────────────────────

@router.get("/api/v1/auth/google/nonce", response_model=GoogleNonceResponse, tags=["Autenticación"], summary="Obtener nonce para Google OAuth")
@limiter.limit("30/minute")
async def api_get_google_nonce(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Genera y retorna un nonce para Google OAuth.
    El nonce debe incluirse en el parámetro 'nonce' de la solicitud a Google.
    Este nonce es validado en el id_token para prevenir ataques de replay.
    
    TTL: 5 minutos
    """
    try:
        nonce = await generate_and_store_nonce(db)
        return GoogleNonceResponse(nonce=nonce)
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"Error al generar nonce: {str(e)}")


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
    
    REQUERIDO: Un nonce válido para prevenir replay attacks. Obtenerlo en GET /api/v1/auth/google/nonce.
    """
    from fastapi import HTTPException
    ip = request.client.host if request.client else None

    try:
        temp_token, totp_qr, totp_secret = await login_or_register_google(
            db, datos.id_token, nonce=datos.nonce, ip_origen=ip
        )
        return PreAuthResponse(
            status="requires_2fa",
            temp_token=temp_token,
            totp_qr_code=totp_qr,
            totp_secret=totp_secret,
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
        access_token, raw_refresh, rol, redirect_url, needs_profile = await verify_totp_and_get_token(
            db, datos.temp_token, datos.totp_code, ip
        )

        response = JSONResponse(content={
            "access_token": access_token,
            "token_type": "bearer",
            "rol": rol,
            "redirect_url": redirect_url,
            "needs_profile": needs_profile,
        })

        # Guardar refresh token en cookie
        _set_auth_cookies(response, access_token, raw_refresh)
        return response
    except LoginError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
