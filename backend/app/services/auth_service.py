"""
Servicio de autenticación — lógica de negocio para registro, login, refresh y logout.
"""
from datetime import datetime, timedelta, timezone

import pyotp
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import (
    generate_refresh_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)
from app.models.evento import Evento
from app.models.log_auditoria import LogAuditoria
from app.models.refresh_token import RefreshToken
from app.models.usuario import Usuario
from app.models.usuario_evento import UsuarioEvento
from app.schemas.usuario import RegistroRequest


# ── Errores de negocio ────────────────────────────────────────────────────────

class RegistroError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class LoginError(Exception):
    def __init__(self, message: str = "Credenciales inválidas", status_code: int = 401):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


# ── Auditoría ─────────────────────────────────────────────────────────────────

async def _log(
    db: AsyncSession,
    tipo_evento: str,
    id_matricula: str | None = None,
    ip_origen: str | None = None,
    detalle: str | None = None,
) -> None:
    """Inserta un registro en logs_auditoria."""
    log = LogAuditoria(
        tipo_evento=tipo_evento,
        id_matricula=id_matricula,
        ip_origen=ip_origen,
        detalle=detalle,
    )
    db.add(log)
    # No hacemos commit aquí; se delega al llamador


# ── ETAPA 1: Registro ─────────────────────────────────────────────────────────

async def obtener_eventos_disponibles(db: AsyncSession) -> list[Evento]:
    """Retorna todos los eventos disponibles para selección en el registro."""
    result = await db.execute(select(Evento).order_by(Evento.anio, Evento.id_evento))
    return list(result.scalars().all())


async def registrar_alumno(db: AsyncSession, datos: RegistroRequest) -> dict:
    """
    Registra un nuevo alumno en el sistema.
    Raises: RegistroError si hay duplicados o eventos inválidos.
    """
    # 1. Verificar matrícula única
    result = await db.execute(select(Usuario).where(Usuario.id_matricula == datos.matricula))
    if result.scalar_one_or_none():
        raise RegistroError("La matrícula ya está registrada en el sistema.")

    # 2. Verificar correo único
    result = await db.execute(select(Usuario).where(Usuario.correo == datos.correo))
    if result.scalar_one_or_none():
        raise RegistroError("El correo ya está registrado en el sistema.")

    # 3. Validar eventos
    eventos_ids = list(set(datos.eventos_seleccionados))
    if len(eventos_ids) == 0 or len(eventos_ids) > 2:
        raise RegistroError("Debes seleccionar entre 1 y 2 eventos distintos.")

    result = await db.execute(select(Evento).where(Evento.id_evento.in_(eventos_ids)))
    eventos_encontrados = list(result.scalars().all())
    if len(eventos_encontrados) != len(eventos_ids):
        raise RegistroError("Uno o más eventos seleccionados no existen.")

    # 4. Crear usuario
    nuevo_usuario = Usuario(
        id_matricula=datos.matricula,
        nombre=datos.nombre,
        correo=datos.correo,
        carrera=datos.carrera,
        semestre=datos.semestre,
        password_hash=hash_password(datos.password),
        totp_secret=pyotp.random_base32(),
    )
    db.add(nuevo_usuario)
    await db.flush()

    # 5. Crear relaciones usuario-evento
    for id_evento in eventos_ids:
        db.add(UsuarioEvento(id_matricula=datos.matricula, id_evento=id_evento))

    # 6. Log de auditoría
    await _log(db, "REGISTRO_NUEVO", id_matricula=datos.matricula)

    await db.commit()
    return {
        "message": "Registro exitoso",
        "matricula": datos.matricula,
        "eventos_registrados": len(eventos_ids),
    }


# ── ETAPA 2: Login ────────────────────────────────────────────────────────────

async def login_alumno(
    db: AsyncSession,
    correo: str,
    password: str,
    ip_origen: str | None = None,
) -> tuple[str, str]:
    """
    Autentica a un alumno. Retorna (access_token, raw_refresh_token).
    Raises: LoginError si las credenciales son inválidas.
    """
    from app.core.security import create_access_token

    # 1. Buscar usuario
    result = await db.execute(select(Usuario).where(Usuario.correo == correo.lower()))
    usuario = result.scalar_one_or_none()

    if not usuario or not verify_password(password, usuario.password_hash):
        await _log(db, "LOGIN_FALLIDO", ip_origen=ip_origen, detalle=f"correo: {correo}")
        await db.commit()
        raise LoginError()

    # 2. Emitir Access Token (JWT)
    access_token = create_access_token({
        "sub": usuario.id_matricula,
        "rol": "alumno",
        "nombre": usuario.nombre,
    })

    # 3. Emitir Refresh Token y guardar hash en DB
    raw_refresh = generate_refresh_token()
    token_hash = hash_refresh_token(raw_refresh)
    expira_en = datetime.now(timezone.utc) + timedelta(hours=settings.REFRESH_TOKEN_EXPIRE_HOURS)

    db.add(RefreshToken(
        token_hash=token_hash,
        id_matricula=usuario.id_matricula,
        expira_en=expira_en,
        revocado=False,
    ))

    # 4. Log de auditoría
    await _log(db, "LOGIN_EXITOSO", id_matricula=usuario.id_matricula, ip_origen=ip_origen)

    await db.commit()
    return access_token, raw_refresh


async def refresh_session(db: AsyncSession, raw_token: str) -> str:
    """
    Renueva el Access Token usando el Refresh Token de la cookie.
    Retorna el nuevo access_token.
    Raises: LoginError si el token no es válido, está revocado o expiró.
    """
    from app.core.security import create_access_token

    token_hash = hash_refresh_token(raw_token)
    now = datetime.now(timezone.utc)

    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.revocado == False,  # noqa: E712
            RefreshToken.expira_en > now,
        )
    )
    refresh_record = result.scalar_one_or_none()
    if not refresh_record:
        raise LoginError("Sesión expirada, inicia sesión nuevamente")

    # Obtener datos del usuario para el nuevo token
    result = await db.execute(
        select(Usuario).where(Usuario.id_matricula == refresh_record.id_matricula)
    )
    usuario = result.scalar_one_or_none()
    if not usuario:
        raise LoginError("Usuario no encontrado")

    new_access_token = create_access_token({
        "sub": usuario.id_matricula,
        "rol": "alumno",
        "nombre": usuario.nombre,
    })
    return new_access_token


async def logout_alumno(db: AsyncSession, raw_token: str, id_matricula: str | None = None) -> None:
    """
    Revoca el Refresh Token y registra el evento de logout.
    """
    token_hash = hash_refresh_token(raw_token)

    result = await db.execute(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    )
    refresh_record = result.scalar_one_or_none()
    if refresh_record:
        refresh_record.revocado = True

    await _log(db, "LOGOUT", id_matricula=id_matricula)
    await db.commit()
