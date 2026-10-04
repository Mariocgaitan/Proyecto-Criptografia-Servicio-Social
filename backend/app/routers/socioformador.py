"""
Router del módulo Socioformador — login y escáner QR para representantes de socioformador.
"""
from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.limiter import limiter
from app.db.session import get_db
from app.services.socioformador_service import (
    EscanerError,
    eliminar_inscripcion_proyecto,
    obtener_id_socioformador_de_proyecto,
    obtener_info_proyecto,
    obtener_proyectos_socioformador,
    proyecto_pertenece_a_socioformador,
    validar_y_inscribir,
)
from app.services.email_service import enviar_correo_inscripcion, enviar_correo_baja

router = APIRouter()

REFRESH_COOKIE_MAX_AGE = 8 * 60 * 60  # 8 horas


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_socioformador_user(request: Request, db: AsyncSession):
    """Extrae y valida el usuario socioformador del access_token en cookie."""
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
    if not user or user.rol != "socioformador":
        raise HTTPException(status_code=403, detail="Acceso solo para representantes de socioformador")
    return user


async def _resolver_id_socioformador(user, db: AsyncSession) -> int:
    """
    Obtiene el socioformador del usuario socioformador.
    Prioriza id_socioformador (nuevo modelo) y usa id_proyecto como fallback legacy.
    """
    if user.id_socioformador:
        return user.id_socioformador

    if user.id_proyecto:
        return await obtener_id_socioformador_de_proyecto(db, user.id_proyecto)

    raise HTTPException(status_code=400, detail="Sin socioformador asignada")




# ── API: Validar QR ───────────────────────────────────────────────────────────

class QRScan(BaseModel):
    qr_data: str  # El JSON crudo del QR escaneado
    id_proyecto: int | None = None


@router.post("/api/v1/socioformador/escanear", tags=["Socioformador"])
@limiter.limit("30/minute")
async def api_escanear_qr(
    request: Request,
    payload: QRScan,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """
    Valida y procesa un QR escaneado.
    El usuario socioformador solo puede inscribir alumnos en proyectos de su socioformador.
    """
    user = await _get_socioformador_user(request, db)
    id_socioformador = await _resolver_id_socioformador(user, db)

    if payload.id_proyecto is None:
        proyectos = await obtener_proyectos_socioformador(db, id_socioformador)
        if not proyectos:
            raise HTTPException(status_code=404, detail="El socioformador no tiene proyectos")
        id_proyecto_objetivo = proyectos[0]["id_proyecto"]
    else:
        id_proyecto_objetivo = payload.id_proyecto

    if not await proyecto_pertenece_a_socioformador(db, id_socioformador, id_proyecto_objetivo):
        raise HTTPException(status_code=403, detail="El proyecto no pertenece a tu socioformador")

    try:
        resultado = await validar_y_inscribir(db, id_proyecto_objetivo, payload.qr_data)
        if resultado.get("ok") and resultado.get("correo_alumno"):
            background_tasks.add_task(
                enviar_correo_inscripcion,
                to_email=resultado["correo_alumno"],
                nombre_alumno=resultado["nombre_alumno"],
                nombre_proyecto=resultado["nombre_proyecto"],
                nombre_socioformador=resultado["nombre_socioformador"],
            )
    except EscanerError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)

    return resultado


# ── API: Info proyecto ────────────────────────────────────────────────────────

@router.get("/api/v1/socioformador/proyecto", tags=["Socioformador"])
async def api_info_proyecto(
    request: Request,
    id_proyecto: int | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Devuelve la información de un proyecto del socioformador del usuario logueado."""
    user = await _get_socioformador_user(request, db)
    id_socioformador = await _resolver_id_socioformador(user, db)

    if id_proyecto is None:
        proyectos = await obtener_proyectos_socioformador(db, id_socioformador)
        if not proyectos:
            raise HTTPException(status_code=404, detail="El socioformador no tiene proyectos")
        id_proyecto_objetivo = proyectos[0]["id_proyecto"]
    else:
        id_proyecto_objetivo = id_proyecto

    if not await proyecto_pertenece_a_socioformador(db, id_socioformador, id_proyecto_objetivo):
        raise HTTPException(status_code=403, detail="El proyecto no pertenece a tu socioformador")

    try:
        return await obtener_info_proyecto(db, id_proyecto_objetivo)
    except EscanerError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.get("/api/v1/socioformador/proyectos", tags=["Socioformador"])
async def api_lista_proyectos_socioformador(request: Request, db: AsyncSession = Depends(get_db)):
    """Lista proyectos/eventos disponibles para el socioformador del usuario logueado."""
    user = await _get_socioformador_user(request, db)
    id_socioformador = await _resolver_id_socioformador(user, db)
    proyectos = await obtener_proyectos_socioformador(db, id_socioformador)
    return {"proyectos": proyectos}


@router.delete("/api/v1/socioformador/inscripciones/{id_inscripcion}", tags=["Socioformador"])
async def api_eliminar_inscripcion_socioformador(
    id_inscripcion: str,
    request: Request,
    background_tasks: BackgroundTasks,
    id_proyecto: int | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Elimina una inscripción dentro de un proyecto del socioformador autenticada."""
    user = await _get_socioformador_user(request, db)
    id_socioformador = await _resolver_id_socioformador(user, db)

    if id_proyecto is None:
        proyectos = await obtener_proyectos_socioformador(db, id_socioformador)
        if not proyectos:
            raise HTTPException(status_code=404, detail="El socioformador no tiene proyectos")
        id_proyecto_objetivo = proyectos[0]["id_proyecto"]
    else:
        id_proyecto_objetivo = id_proyecto

    if not await proyecto_pertenece_a_socioformador(db, id_socioformador, id_proyecto_objetivo):
        raise HTTPException(status_code=403, detail="El proyecto no pertenece a tu socioformador")

    try:
        resultado = await eliminar_inscripcion_proyecto(
            db,
            id_socioformador=id_socioformador,
            id_proyecto=id_proyecto_objetivo,
            id_inscripcion=id_inscripcion,
            actor_matricula=user.id_matricula,
            ip_origen=request.client.host if request.client else None,
        )
        if resultado.get("ok") and resultado.get("correo_alumno"):
            background_tasks.add_task(
                enviar_correo_baja,
                to_email=resultado["correo_alumno"],
                nombre_alumno=resultado["nombre_alumno"],
                nombre_proyecto=resultado["nombre_proyecto"],
                nombre_socioformador=resultado["nombre_socioformador"],
            )
        return resultado
    except EscanerError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
