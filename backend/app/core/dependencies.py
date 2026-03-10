"""
Dependencias de FastAPI para autenticación.

Provee:
  - get_current_user()  → Usuario autenticado (cualquier rol)
  - get_current_admin() → Solo usuarios con rol=='admin'
"""
import jwt
from fastapi import Cookie, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.models.usuario import Usuario


def _decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")


def _extract_token(request: Request) -> str:
    """Extrae el access token del header Authorization o de la cookie."""
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth.split(" ", 1)[1]
    
    token = request.cookies.get("access_token")
    if token:
        return token
    
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No autenticado",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> Usuario:
    """Dependency: usuario autenticado (cualquier rol)."""
    token = _extract_token(request)
    payload = _decode_access_token(token)
    matricula: str = payload.get("sub")
    if not matricula:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")

    result = await db.execute(select(Usuario).where(Usuario.id_matricula == matricula))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no encontrado")
    return user


async def get_current_user_optional(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> Usuario | None:
    """Dependency para rutas SSR: extrae el JWT desde la cookie 'access_token' y devuelve el Usuario."""
    token = request.cookies.get("access_token")
    if not token:
        return None
    try:
        payload = _decode_access_token(token)
        matricula: str = payload.get("sub")
        if not matricula:
            return None
        result = await db.execute(select(Usuario).where(Usuario.id_matricula == matricula))
        return result.scalar_one_or_none()
    except HTTPException:
        return None


async def get_current_admin(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> Usuario:
    """Dependency: solo usuarios con rol=='admin'."""
    user = await get_current_user(request, db)
    if user.rol != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado: se requiere rol de administrador",
        )
    return user
