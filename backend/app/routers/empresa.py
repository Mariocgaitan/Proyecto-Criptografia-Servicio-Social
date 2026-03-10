"""
Router del módulo Empresa — login y escáner QR para representantes de empresa.
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.services.auth_service import LoginError, login_alumno
from app.services.empresa_service import EscanerError, obtener_info_proyecto, validar_y_inscribir

router = APIRouter()

REFRESH_COOKIE_MAX_AGE = 8 * 60 * 60  # 8 horas


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_empresa_user(request: Request, db: AsyncSession):
    """Extrae y valida el usuario empresa del access_token en cookie."""
    from sqlalchemy import select
    import jwt
    from app.core.config import settings
    from app.models.usuario import Usuario

    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="No autenticado")
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

    matricula = payload.get("sub")
    result = await db.execute(select(Usuario).where(Usuario.id_matricula == matricula))
    user = result.scalar_one_or_none()
    if not user or user.rol != "empresa":
        raise HTTPException(status_code=403, detail="Acceso solo para representantes de empresa")
    return user




# ── API: Validar QR ───────────────────────────────────────────────────────────

class QRScan(BaseModel):
    qr_data: str  # El JSON crudo del QR escaneado


@router.post("/api/v1/empresa/escanear", tags=["Empresa"])
async def api_escanear_qr(
    request: Request,
    payload: QRScan,
    db: AsyncSession = Depends(get_db),
):
    """
    Valida y procesa un QR escaneado.
    El usuario empresa solo puede inscribir alumnos en su propio proyecto.
    """
    user = await _get_empresa_user(request, db)

    if not user.id_proyecto:
        raise HTTPException(status_code=400, detail="Sin proyecto asignado")

    try:
        resultado = await validar_y_inscribir(db, user.id_proyecto, payload.qr_data)
    except EscanerError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)

    return resultado


# ── API: Info proyecto ────────────────────────────────────────────────────────

@router.get("/api/v1/empresa/proyecto", tags=["Empresa"])
async def api_info_proyecto(request: Request, db: AsyncSession = Depends(get_db)):
    """Devuelve la información del proyecto asignado al representante logueado."""
    user = await _get_empresa_user(request, db)
    if not user.id_proyecto:
        raise HTTPException(status_code=400, detail="Sin proyecto asignado")
    try:
        return await obtener_info_proyecto(db, user.id_proyecto)
    except EscanerError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
