"""
Servicio de autenticación — lógica de negocio para registro, login, refresh y logout.
"""
from datetime import datetime, timedelta, timezone
import re

import pyotp
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.role_switch import resolve_effective_role
from app.core.security import (
    generate_refresh_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)
from app.models.evento import Evento
from app.models.log_auditoria import LogAuditoria
from app.models.padron_alumno import PadronAlumno
from app.models.refresh_token import RefreshToken
from app.models.usuario import Usuario
from app.models.usuario_evento import UsuarioEvento
from app.schemas.usuario import RegistroRequest


# Catálogo de carreras disponibles para el registro de alumnos.
CARRERAS_DISPONIBLES: tuple[str, ...] = (
    "ITC",
    "ISC",
    "ICI",
    "IIA",
    "IIS",
    "IMT",
)


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


def _normalizar_identificador_login(identificador: str) -> str:
    """Si el login viene como matrícula A0xxxxxxx, lo transforma a correo institucional."""
    valor = identificador.strip()
    if re.fullmatch(r"[aA]0\d{7}", valor):
        return f"{valor.lower()}@tec.mx"
    return valor.lower()


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


def obtener_carreras_disponibles() -> list[str]:
    """Retorna el catálogo oficial de carreras para el formulario de registro."""
    return list(CARRERAS_DISPONIBLES)


async def registrar_alumno(db: AsyncSession, datos: RegistroRequest) -> dict:
    """
    Registra un nuevo alumno en el sistema.
    Raises: RegistroError si hay duplicados, eventos inválidos o matrícula no autorizada.
    """
    # 0. Verificar que la matrícula existe en el padrón
    padron_result = await db.execute(
        select(PadronAlumno).where(PadronAlumno.id_matricula == datos.matricula)
    )
    alumno_padron = padron_result.scalar_one_or_none()

    if not alumno_padron:
        raise RegistroError("La matrícula no se encuentra en el padrón oficial de alumnos.")

    # Validación estricta contra padrón: nombre + carrera + semestre
    nombre_padron = " ".join(alumno_padron.nombre_completo.lower().split())
    nombre_ingresado = " ".join(datos.nombre.lower().split())
    carrera_padron = (alumno_padron.carrera or "").strip().upper()
    carrera_ingresada = datos.carrera.strip().upper()
    semestre_padron = alumno_padron.semestre

    if nombre_padron != nombre_ingresado:
        raise RegistroError(
            "El nombre no coincide con el registrado para esta matrícula. "
            "Asegúrate de ingresar tu nombre completo como aparece en tu credencial."
        )

    if not carrera_padron or semestre_padron is None:
        raise RegistroError(
            "La información del padrón para esta matrícula está incompleta (carrera/semestre)."
        )

    if carrera_ingresada != carrera_padron:
        raise RegistroError("La carrera no coincide con el padrón oficial para esta matrícula.")

    if datos.semestre != semestre_padron:
        raise RegistroError("El semestre no coincide con el padrón oficial para esta matrícula.")

    # 1. Verificar matrícula única
    result = await db.execute(select(Usuario).where(Usuario.id_matricula == datos.matricula))
    if result.scalar_one_or_none():
        raise RegistroError("La matrícula ya está registrada en el sistema.")

    # 2. Generar correo institucional a partir de matrícula y verificar unicidad
    correo_generado = f"{datos.matricula.lower()}@tec.mx"
    result = await db.execute(select(Usuario).where(Usuario.correo == correo_generado))
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

    carrera_normalizada = carrera_ingresada
    if carrera_normalizada not in CARRERAS_DISPONIBLES:
        raise RegistroError("La carrera seleccionada no es válida.")

    # 4. Crear usuario
    nuevo_usuario = Usuario(
        id_matricula=datos.matricula,
        nombre=datos.nombre,
        correo=correo_generado,
        carrera=carrera_normalizada,
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

    correo_normalizado = _normalizar_identificador_login(correo)

    # 1. Buscar usuario
    result = await db.execute(select(Usuario).where(Usuario.correo == correo_normalizado))
    usuario = result.scalar_one_or_none()

    if not usuario:
        await _log(db, "LOGIN_FALLIDO", ip_origen=ip_origen, detalle=f"correo: {correo_normalizado}")
        await db.commit()
        raise LoginError()

    # 2. Verificar lockout activo
    now = datetime.now(timezone.utc)
    if usuario.locked_until is not None and usuario.locked_until > now:
        minutos_restantes = int((usuario.locked_until - now).total_seconds() / 60) + 1
        await _log(
            db,
            "LOGIN_BLOQUEADO",
            id_matricula=usuario.id_matricula,
            ip_origen=ip_origen,
            detalle=f"cuenta bloqueada hasta {usuario.locked_until.isoformat()}",
        )
        await db.commit()
        raise LoginError(
            f"Cuenta bloqueada. Intenta de nuevo en {minutos_restantes} minuto(s).",
            status_code=429,
        )

    # 3. Verificar contraseña
    if not verify_password(password, usuario.password_hash):
        usuario.failed_login_attempts += 1
        if usuario.failed_login_attempts >= settings.MAX_FAILED_LOGIN_ATTEMPTS:
            usuario.locked_until = now + timedelta(minutes=settings.LOCKOUT_DURATION_MINUTES)
            await _log(
                db,
                "CUENTA_BLOQUEADA",
                id_matricula=usuario.id_matricula,
                ip_origen=ip_origen,
                detalle=(
                    f"bloqueada tras {usuario.failed_login_attempts} intentos fallidos; "
                    f"hasta {usuario.locked_until.isoformat()}"
                ),
            )
        else:
            await _log(
                db,
                "LOGIN_FALLIDO",
                id_matricula=usuario.id_matricula,
                ip_origen=ip_origen,
                detalle=f"intento {usuario.failed_login_attempts} de {settings.MAX_FAILED_LOGIN_ATTEMPTS}",
            )
        await db.commit()
        raise LoginError()

    # 4. Contraseña correcta — resetear contadores de lockout
    usuario.failed_login_attempts = 0
    usuario.locked_until = None

    # 2. Emitir Access Token (JWT)
    effective_role = resolve_effective_role(usuario.correo, usuario.rol)

    access_token = create_access_token({
        "sub": usuario.id_matricula,
        "rol": effective_role,
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

    # En modo pruebas, si se fuerza rol alumno para un correo puntual,
    # se asignan eventos activos para habilitar el flujo completo del dashboard.
    await _ensure_test_alumno_eventos(db, usuario, effective_role)

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

    result = await db.execute(
        select(Usuario).where(Usuario.id_matricula == refresh_record.id_matricula)
    )
    usuario = result.scalar_one_or_none()
    if not usuario:
        raise LoginError("Usuario no encontrado")

    effective_role = resolve_effective_role(usuario.correo, usuario.rol)

    new_access_token = create_access_token({
        "sub": usuario.id_matricula,
        "rol": effective_role,
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


# ── ETAPA 3: Google OAuth + Pre-Auth ─────────────────────────────────────────

async def login_or_register_google(
    db: AsyncSession,
    id_token: str,
    ip_origen: str | None = None,
) -> tuple[str, str | None]:
    """
    Autentica con Google SSO o crea nuevo usuario.
    Retorna: (temp_token, totp_qr_code_url)
    - temp_token: Token temporal que requiere TOTP para completar auth
    - totp_qr_code_url: QR code si es primera vez configurando TOTP, None si ya existe
    
    Raises: LoginError si el id_token es inválido.
    """
    from app.core.security import validate_google_token, generate_pre_auth_token, hash_pre_auth_token
    from app.models.pre_auth_token import PreAuthToken
    
    try:
        google_info = validate_google_token(id_token)
    except ValueError as e:
        await _log(db, "GOOGLE_LOGIN_FALLIDO", ip_origen=ip_origen, detalle=f"Token inválido: {str(e)}")
        await db.commit()
        raise LoginError(f"Google token inválido: {str(e)}", 401)
    
    correo = google_info.get("email", "").lower()
    nombre = google_info.get("name", "Usuario de Google")
    
    if not correo:
        raise LoginError("No se pudo obtener email de Google", 400)

    # Solo se permiten cuentas institucionales del Tec.
    if not correo.endswith("@tec.mx"):
        await _log(
            db,
            "GOOGLE_LOGIN_FALLIDO",
            ip_origen=ip_origen,
            detalle=f"Dominio no permitido: {correo}",
        )
        await db.commit()
        raise LoginError("Solo se permite iniciar sesión con correos @tec.mx", 403)
    
    # 1. Buscar usuario existente
    result = await db.execute(select(Usuario).where(Usuario.correo == correo))
    usuario = result.scalar_one_or_none()
    
    # 2. Si no existe, crear nuevo usuario (registro automático diferido)
    if not usuario:
        # Generar TOTP nuevo sin guardarlo en base de datos aún
        totp_secret = pyotp.random_base32()
        
        await _log(db, "REGISTRO_GOOGLE_INICIADO", ip_origen=ip_origen, detalle=f"correo: {correo}")
        totp_qr = _generate_totp_qr(correo, totp_secret)
        
        # Generar temp_token como JWT
        from app.core.security import create_pre_auth_jwt
        temp_token = create_pre_auth_jwt({
            "action": "google_register",
            "correo": correo,
            "nombre": nombre,
            "totp_secret": totp_secret,
        })
        
        # Importante: No se inserta el usuario en base de datos sino hasta verify_totp
        await db.commit()
        return temp_token, totp_qr
    else:
        # Usuario existente - si no tiene TOTP, generarlo
        if not usuario.totp_secret or usuario.totp_secret == "":
            usuario.totp_secret = pyotp.random_base32()
            await db.flush()
            totp_qr = _generate_totp_qr(correo, usuario.totp_secret)
        else:
            totp_qr = None
        
        await _log(db, "LOGIN_GOOGLE_EXITOSO", id_matricula=usuario.id_matricula, ip_origen=ip_origen)
    
        # 3. Generar temp_token (pre-auth)
        raw_temp = generate_pre_auth_token()
        temp_hash = hash_pre_auth_token(raw_temp)
        expira_en = datetime.now(timezone.utc) + timedelta(minutes=settings.PRE_AUTH_TOKEN_EXPIRE_MINUTES)
        
        db.add(PreAuthToken(
            token_hash=temp_hash,
            id_matricula=usuario.id_matricula,
            expira_en=expira_en,
            usado=False,
        ))
        
        await db.commit()
        return raw_temp, totp_qr


async def verify_totp_and_get_token(
    db: AsyncSession,
    temp_token: str,
    totp_code: str,
    ip_origen: str | None = None,
) -> tuple[str, str, str]:
    """
    Verifica el código TOTP usando el temp_token del pre-auth.
    Retorna: (access_token, rol, redirect_url)
    
    Raises: LoginError si el temp_token es inválido o el TOTP es incorrecto.
    """
    from app.core.security import hash_pre_auth_token, create_access_token, decode_pre_auth_jwt
    from app.models.pre_auth_token import PreAuthToken
    import jwt
    
    usuario = None
    
    # Intenta decodificar como JWT (Flujo de registro nuevo de Google)
    is_jwt = False
    try:
        payload = decode_pre_auth_jwt(temp_token)
        is_jwt = True
    except jwt.InvalidTokenError:
        pass
        
    if is_jwt:
        if payload.get("action") != "google_register":
            raise LoginError("Token temporal inválido para registro", 401)
            
        correo = payload["correo"]
        totp_secret = payload["totp_secret"]
        nombre = payload["nombre"]
        
        # Validar TOTP directamente con el secreto en el token
        totp_obj = pyotp.TOTP(totp_secret)
        if not totp_obj.verify(totp_code):
            await _log(db, "TOTP_FALLIDO", ip_origen=ip_origen, detalle=f"correo: {correo}")
            await db.commit()
            raise LoginError("Código TOTP inválido", 401)
            
        # Verificar que el usuario no fue registrado entre tanto
        result = await db.execute(select(Usuario).where(Usuario.correo == correo))
        if result.scalar_one_or_none():
            raise LoginError("El correo ya fue registrado", 400)
            
        # Validar si el correo fuerza un rol de pruebas (admin/empresa)
        effective_role = resolve_effective_role(correo, "alumno")
        
        import uuid
        prefix = "ADM" if effective_role == "admin" else "EMP" if effective_role == "empresa" else "GGL"
        temp_matricula = f"{prefix}-{uuid.uuid4().hex[:8].upper()}"
        
        usuario = Usuario(
            id_matricula=temp_matricula,
            nombre=nombre,
            correo=correo,
            carrera="ITC",
            semestre=1,
            password_hash=None,
            is_google_login=True,
            totp_secret=totp_secret,
            rol=effective_role,
        )
        db.add(usuario)
        await db.flush()
        await _log(db, "REGISTRO_GOOGLE_NUEVO", id_matricula=temp_matricula, ip_origen=ip_origen)

    else:
        temp_hash = hash_pre_auth_token(temp_token)
        now = datetime.now(timezone.utc)
        
        # 1. Validar temp_token en BD
        result = await db.execute(
            select(PreAuthToken).where(
                PreAuthToken.token_hash == temp_hash,
                PreAuthToken.usado == False,  # noqa: E712
                PreAuthToken.expira_en > now,
            )
        )
        pre_auth_record = result.scalar_one_or_none()
        if not pre_auth_record:
            raise LoginError("Temp token inválido, expirado o ya usado", 401)
        
        # 2. Obtener usuario
        result = await db.execute(
            select(Usuario).where(Usuario.id_matricula == pre_auth_record.id_matricula)
        )
        usuario = result.scalar_one_or_none()
        if not usuario:
            raise LoginError("Usuario no encontrado", 404)
        
        # 3. Validar TOTP
        totp_obj = pyotp.TOTP(usuario.totp_secret)
        if not totp_obj.verify(totp_code):
            await _log(db, "TOTP_FALLIDO", id_matricula=usuario.id_matricula, ip_origen=ip_origen)
            await db.commit()
            raise LoginError("Código TOTP inválido", 401)
        
        # 4. Marcar temp_token como usado
        pre_auth_record.usado = True
    
    # 5. Generar tokens finales
    effective_role = resolve_effective_role(usuario.correo, usuario.rol)

    access_token = create_access_token({
        "sub": usuario.id_matricula,
        "rol": effective_role,
        "nombre": usuario.nombre,
    })
    
    raw_refresh = generate_refresh_token()
    token_hash = hash_refresh_token(raw_refresh)
    expira_en = datetime.now(timezone.utc) + timedelta(hours=settings.REFRESH_TOKEN_EXPIRE_HOURS)
    
    db.add(RefreshToken(
        token_hash=token_hash,
        id_matricula=usuario.id_matricula,
        expira_en=expira_en,
        revocado=False,
    ))
    
    # 6. Determinar redirección según rol
    redirect_map = {
        "alumno": "/dashboard",
        "empresa": "/empresa/escaner",
        "admin": "/admin/dashboard",
    }
    redirect_url = redirect_map.get(effective_role, "/dashboard")
    
    # 7. Guardar refresh token en cookie (se hace en el endpoint)
    await _log(db, "TOTP_EXITOSO", id_matricula=usuario.id_matricula, ip_origen=ip_origen)

    # En modo pruebas, habilita eventos para el alumno forzado sin requerir padrón/registro.
    await _ensure_test_alumno_eventos(db, usuario, effective_role)

    await db.commit()
    
    return access_token, raw_refresh, effective_role, redirect_url


async def _ensure_test_alumno_eventos(db: AsyncSession, usuario: Usuario, effective_role: str) -> None:
    """Asigna eventos activos al alumno de pruebas si aún no tiene asignaciones."""
    if effective_role != "alumno" or not settings.TEST_ROLE_SWITCH_ENABLED:
        return

    target_email = settings.TEST_ROLE_SWITCH_EMAIL.strip().lower()
    if not target_email or (usuario.correo or "").strip().lower() != target_email:
        return

    result = await db.execute(
        select(UsuarioEvento.id).where(UsuarioEvento.id_matricula == usuario.id_matricula).limit(1)
    )
    if result.scalar_one_or_none() is not None:
        return

    result = await db.execute(
        select(Evento)
        .where(Evento.activo.is_(True))
        .order_by(Evento.id_evento)
        .limit(2)
    )
    eventos_activos = list(result.scalars().all())

    for evento in eventos_activos:
        db.add(UsuarioEvento(id_matricula=usuario.id_matricula, id_evento=evento.id_evento))


# ── Utilidades TOTP ──────────────────────────────────────────────────────────

def _generate_totp_qr(email: str, secret: str) -> str:
    """Genera URL del código QR para vincular Authenticator."""
    totp_obj = pyotp.TOTP(secret)
    qr_uri = totp_obj.provisioning_uri(
        name=email,
        issuer_name="Feria Servicio Social"
    )
    
    # Usar qrcode para generar la imagen
    import qrcode
    import io
    import base64
    
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(qr_uri)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    
    # Convertir a base64 para enviar como data URL
    qr_base64 = base64.b64encode(buffer.getvalue()).decode()
    return f"data:image/png;base64,{qr_base64}"

