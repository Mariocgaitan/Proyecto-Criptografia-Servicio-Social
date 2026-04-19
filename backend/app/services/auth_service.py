"""
Servicio de autenticación — lógica de negocio para login, refresh y logout.
"""
from datetime import datetime, timedelta, timezone
import re

import pyotp
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.role_switch import resolve_effective_role
from app.core.security import (
    generate_refresh_token,
    hash_password,
    hash_refresh_token,
    verify_password,
    generate_nonce,
    hash_nonce,
)
from app.models.evento import Evento
from app.models.google_nonce import GoogleNonce
from app.models.log_auditoria import LogAuditoria
from app.models.padron_alumno import PadronAlumno
from app.models.refresh_token import RefreshToken
from app.models.usuario import Usuario
from app.models.usuario_evento import UsuarioEvento


# ── Errores de negocio ────────────────────────────────────────────────────────

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


# ── Google OAuth Nonce Management ────────────────────────────────────────────

async def generate_and_store_nonce(db: AsyncSession) -> str:
    """
    Genera un nonce (UUID4) y lo almacena hasheado en la DB con TTL de 5 minutos.
    El nonce debe ser incluido en el request a Google y será validado en el id_token.
    
    Retorna: El nonce en plaintext (para enviar al frontend)
    """
    nonce = generate_nonce()
    nonce_h = hash_nonce(nonce)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)
    
    db.add(GoogleNonce(
        nonce_hash=nonce_h,
        expira_en=expires_at,
        usado=False,
    ))
    await db.commit()
    
    return nonce


async def validate_and_consume_nonce(db: AsyncSession, nonce: str | None) -> str | None:
    """
    Valida que el nonce existe, no ha expirado, no ha sido usado.
    Si es válido, lo marca como usado.

    Retorna: El hash del nonce si es válido, None si no.
    """
    if not nonce:
        return None

    nonce_h = hash_nonce(nonce)
    now = datetime.now(timezone.utc)

    result = await db.execute(
        select(GoogleNonce).where(
            GoogleNonce.nonce_hash == nonce_h,
            GoogleNonce.usado == False,  # noqa: E712
            GoogleNonce.expira_en > now,
        )
    )
    nonce_record = result.scalar_one_or_none()

    if nonce_record:
        nonce_record.usado = True
        await db.commit()
        return nonce_h

    return None


async def cleanup_expired_nonces(db: AsyncSession) -> int:
    """
    Elimina nonces expirados o usados de la tabla google_nonces.
    No hace commit — el caller decide cuándo hacer commit.
    Retorna: Número de registros eliminados.
    """
    now = datetime.now(timezone.utc)
    result = await db.execute(
        delete(GoogleNonce).where(
            (GoogleNonce.expira_en <= now) | (GoogleNonce.usado == True)  # noqa: E712
        )
    )
    return result.rowcount


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


# ── Login ────────────────────────────────────────────────────────────

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
        if usuario.locked_until is not None and usuario.locked_until > now:
            minutos = settings.LOCKOUT_DURATION_MINUTES
            raise LoginError(
                f"Demasiados intentos fallidos. Tu cuenta ha sido bloqueada temporalmente. "
                f"Inténtalo de nuevo en {minutos} minuto(s).",
                status_code=429,
            )
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
    nonce: str,
    ip_origen: str | None = None,
) -> tuple[str, str | None]:
    """
    Autentica con Google SSO o crea nuevo usuario.
    Retorna: (temp_token, totp_qr_code_url)
    - temp_token: Token temporal que requiere TOTP para completar auth
    - totp_qr_code_url: QR code si es primera vez configurando TOTP, None si ya existe
    
    Args:
        db: Sesión de base de datos
        id_token: ID Token emitido por Google
        nonce: Nonce que se envió a Google (REQUERIDO para prevenir replay attacks)
        ip_origen: IP del cliente para auditoría
    
    Raises: LoginError si el id_token es inválido o el nonce no coincide.
    """
    from app.core.security import validate_google_token_with_nonce, generate_pre_auth_token, hash_pre_auth_token
    from app.models.pre_auth_token import PreAuthToken
    
    # 1. Validar nonce (OBLIGATORIO)
    if not nonce or not nonce.strip():
        await _log(
            db,
            "GOOGLE_LOGIN_FALLIDO",
            ip_origen=ip_origen,
            detalle="Nonce no proporcionado"
        )
        await db.commit()
        raise LoginError("Nonce requerido para Google OAuth", 400)
    
    nonce_hash = await validate_and_consume_nonce(db, nonce)
    if not nonce_hash:
        await _log(
            db,
            "GOOGLE_LOGIN_FALLIDO",
            ip_origen=ip_origen,
            detalle="Nonce inválido, expirado o ya utilizado"
        )
        await db.commit()
        raise LoginError("Nonce inválido o expirado", 401)

    # 2. Validar token de Google Y verificar que el nonce dentro del id_token coincide
    try:
        google_info = validate_google_token_with_nonce(id_token, nonce_hash)
    except ValueError as e:
        await _log(db, "GOOGLE_LOGIN_FALLIDO", ip_origen=ip_origen, detalle=f"Token inválido: {str(e)}")
        await db.commit()
        raise LoginError(f"Google token inválido: {str(e)}", 401)
    
    correo = google_info.get("email", "").lower()
    nombre = google_info.get("name", "Usuario de Google")
    
    if not correo:
        raise LoginError("No se pudo obtener email de Google", 400)

    # Solo se permiten cuentas institucionales del Tec, excepto el admin de prueba
    if not correo.endswith("@tec.mx") and correo != "mariocarlosgaitanreyna@gmail.com":
        await _log(
            db,
            "GOOGLE_LOGIN_FALLIDO",
            ip_origen=ip_origen,
            detalle=f"Dominio no permitido: {correo}",
        )
        await db.commit()
        raise LoginError("Solo se permite iniciar sesión con correos @tec.mx (excepción admin temporal)", 403)
    
    # 3. Buscar usuario existente
    result = await db.execute(select(Usuario).where(Usuario.correo == correo))
    usuario = result.scalar_one_or_none()
    
    # 2. Si no existe, crear nuevo usuario (registro automático diferido)
    if not usuario:
        from app.models.temp_totp_secret import TempTotpSecret

        totp_secret = pyotp.random_base32()

        await _log(db, "REGISTRO_GOOGLE_INICIADO", ip_origen=ip_origen, detalle=f"correo: {correo}")
        totp_qr = _generate_totp_qr(correo, totp_secret)

        # Guardar secreto TOTP en tabla temporal (no en JWT)
        raw_temp = generate_pre_auth_token()
        temp_hash = hash_pre_auth_token(raw_temp)
        expira_en = datetime.now(timezone.utc) + timedelta(minutes=settings.PRE_AUTH_TOKEN_EXPIRE_MINUTES)

        db.add(TempTotpSecret(
            token_hash=temp_hash,
            correo=correo,
            nombre=nombre,
            totp_secret=totp_secret,
            expira_en=expira_en,
            usado=False,
        ))

        await db.commit()
        return raw_temp, totp_qr, totp_secret
    else:
        # Usuario existente - si no tiene TOTP, generarlo
        totp_secret = None
        if not usuario.totp_secret or usuario.totp_secret == "":
            usuario.totp_secret = pyotp.random_base32()
            await db.flush()
            totp_qr = _generate_totp_qr(correo, usuario.totp_secret)
            totp_secret = usuario.totp_secret
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
        return raw_temp, totp_qr, totp_secret


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
    from app.core.security import hash_pre_auth_token, create_access_token
    from app.models.pre_auth_token import PreAuthToken
    from app.models.temp_totp_secret import TempTotpSecret

    usuario = None
    temp_hash = hash_pre_auth_token(temp_token)
    now = datetime.now(timezone.utc)

    needs_profile = False

    # 1. Buscar en TempTotpSecret (flujo registro Google nuevo)
    result = await db.execute(
        select(TempTotpSecret).where(
            TempTotpSecret.token_hash == temp_hash,
            TempTotpSecret.usado == False,  # noqa: E712
            TempTotpSecret.expira_en > now,
        )
    )
    temp_totp_record = result.scalar_one_or_none()

    if temp_totp_record:
        needs_profile = True
        correo = temp_totp_record.correo
        totp_secret = temp_totp_record.totp_secret
        nombre = temp_totp_record.nombre

        # Validar TOTP
        totp_obj = pyotp.TOTP(totp_secret)
        if not totp_obj.verify(totp_code):
            await _log(db, "TOTP_FALLIDO", ip_origen=ip_origen, detalle=f"correo: {correo}")
            await db.commit()
            raise LoginError("Código TOTP inválido", 401)

        # Verificar que el usuario no fue registrado entre tanto
        result = await db.execute(select(Usuario).where(Usuario.correo == correo))
        if result.scalar_one_or_none():
            raise LoginError("El correo ya fue registrado", 400)

        # Crear usuario nuevo
        effective_role = resolve_effective_role(correo, "alumno")
        if correo in ["leogomez@tec.mx", "mariocarlosgaitanreyna@gmail.com"]:
            effective_role = "admin"
            needs_profile = False

        # Intentar extraer matrícula del correo institucional (A01234567@tec.mx)
        # La matrícula es la ÚNICA llave de match contra el padrón: de ahí sale
        # el nombre, la carrera y el semestre oficiales.
        padron_nombre = None
        padron_carrera = None
        padron_semestre = None
        padron_matricula = None
        if effective_role == "alumno":
            match = re.match(r"^(a0\d{7})@tec\.mx$", correo.lower())
            if match:
                matricula_candidata = match.group(1).upper()
                try:
                    padron_result = await db.execute(
                        select(PadronAlumno).where(PadronAlumno.id_matricula == matricula_candidata)
                    )
                    padron_record = padron_result.scalar_one_or_none()
                    if padron_record:
                        padron_matricula = padron_record.id_matricula
                        padron_nombre = padron_record.nombre_completo
                        padron_carrera = padron_record.carrera
                        padron_semestre = padron_record.semestre
                except Exception as e:
                    # Si hay error consultando el padrón, continúa con el fallback
                    import logging
                    logging.getLogger(__name__).warning(
                        f"Error consultando padrón para {matricula_candidata}: {e}"
                    )

        # Verificar que la matrícula del padrón no esté ya ocupada por otro Usuario
        if padron_matricula:
            existing_check = await db.execute(
                select(Usuario).where(Usuario.id_matricula == padron_matricula)
            )
            if existing_check.scalar_one_or_none():
                padron_matricula = None  # Hay colisión, cae al fallback
                padron_nombre = None
                padron_carrera = None
                padron_semestre = None

        if padron_matricula:
            id_matricula_final = padron_matricula
        else:
            import uuid
            prefix = "ADM" if effective_role == "admin" else "EMP" if effective_role == "empresa" else "GGL"
            id_matricula_final = f"{prefix}-{uuid.uuid4().hex[:8].upper()}"

        # Nombre: el del padrón es la fuente de verdad; si no hay, cae al de Google
        nombre_final = padron_nombre or nombre

        # Carrera/semestre: del padrón si existen; de lo contrario PENDIENTE (alumnos) o N/A
        if padron_carrera:
            carrera_final = padron_carrera
            semestre_final = padron_semestre or 0
        else:
            carrera_final = "PENDIENTE" if effective_role == "alumno" else "N/A"
            semestre_final = 0

        usuario = Usuario(
            id_matricula=id_matricula_final,
            nombre=nombre_final,
            correo=correo,
            carrera=carrera_final,
            semestre=semestre_final,
            password_hash=None,
            is_google_login=True,
            totp_secret=totp_secret,
            rol=effective_role,
        )
        db.add(usuario)
        await db.flush()
        await _log(db, "REGISTRO_GOOGLE_NUEVO", id_matricula=id_matricula_final, ip_origen=ip_origen)

        # Marcar token temporal como usado
        temp_totp_record.usado = True

    else:
        needs_profile = False
        # 2. Buscar en PreAuthToken (flujo usuario existente)
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

        # Obtener usuario
        result = await db.execute(
            select(Usuario).where(Usuario.id_matricula == pre_auth_record.id_matricula)
        )
        usuario = result.scalar_one_or_none()
        if not usuario:
            raise LoginError("Usuario no encontrado", 404)

        # Validar TOTP
        totp_obj = pyotp.TOTP(usuario.totp_secret)
        if not totp_obj.verify(totp_code):
            await _log(db, "TOTP_FALLIDO", id_matricula=usuario.id_matricula, ip_origen=ip_origen)
            await db.commit()
            raise LoginError("Código TOTP inválido", 401)

        # Replay protection: rechazar si el mismo código TOTP se usa dentro de la misma ventana de 30s
        current_window = now.timestamp() // 30
        if usuario.last_totp_used_at is not None:
            last_window = usuario.last_totp_used_at.timestamp() // 30
            if current_window == last_window:
                await _log(db, "TOTP_REPLAY", id_matricula=usuario.id_matricula, ip_origen=ip_origen)
                await db.commit()
                raise LoginError("Código TOTP ya utilizado, espera al siguiente código", 429)
        usuario.last_totp_used_at = now

        # Marcar temp_token como usado
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
    
    return access_token, raw_refresh, effective_role, redirect_url, needs_profile


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

