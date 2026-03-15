from fastapi import APIRouter, Cookie, Depends, Request
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.auth import LoginRequest, TokenResponse
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
)
from app.core.limiter import limiter


router = APIRouter()

# Duración cookie refresh token en segundos (8 horas)
REFRESH_COOKIE_MAX_AGE = 8 * 60 * 60




@router.post("/api/v1/auth/registro", status_code=201, tags=["Autenticación"], summary="Registrar alumno")
async def api_registro(datos: RegistroRequest, db: AsyncSession = Depends(get_db)):
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
async def api_login(datos: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    ip = request.client.host if request.client else None
    try:
        access_token, raw_refresh = await login_alumno(db, datos.correo, datos.password, ip)
    except LoginError as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=e.status_code, detail=e.message)

    response = JSONResponse(content={"access_token": access_token, "token_type": "bearer"})
    response.set_cookie(
        key="refresh_token",
        value=raw_refresh,
        httponly=True,
        secure=False,
        samesite="strict",
        max_age=REFRESH_COOKIE_MAX_AGE,
    )
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=False,
        secure=False,
        samesite="strict",
        max_age=15 * 60,
    )
    return response


@router.post("/api/v1/auth/refresh", response_model=TokenResponse, tags=["Autenticación"], summary="Renovar access token")
async def api_refresh(
    db: AsyncSession = Depends(get_db),
    refresh_token: str | None = Cookie(default=None),
):
    from fastapi import HTTPException
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token no encontrado")
    try:
        new_token = await refresh_session(db, refresh_token)
        response = JSONResponse(content={"access_token": new_token, "token_type": "bearer"})
        response.set_cookie(
            key="access_token",
            value=new_token,
            httponly=False,
            secure=False,
            samesite="strict",
            max_age=15 * 60,
        )
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
