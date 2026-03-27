# Configuración de Autenticación con Google SSO + TOTP (Backend)

## Resumen de Cambios Implementados

El backend ha sido modificado para soportar autenticación unificada multipasos con Google SSL + TOTP obligatorio como segundo factor. El flujo es:

1. **Paso 1**: Usuario proporciona `id_token` de Google al endpoint `/api/v1/auth/google`
2. **Paso 2**: Backend valida el token con servidor de Google
3. **Paso 3**: Si es válido, retorna un `temp_token` (pre-auth token) válido por 10 minutos
4. **Paso 4**: Frontend solicita código TOTP (6 dígitos) del Authenticator
5. **Paso 5**: Frontend envía `temp_token` + `totp_code` a `/api/v1/auth/verify-totp`
6. **Paso 6**: Si TOTP es correcto, retorna `access_token` + `redirect_url` según rol

---

## Nuevos Endpoints

### 1. `POST /api/v1/auth/google`
**Descripción**: Inicia sesión o registra usuario con Google SSO.

**Request**:
```json
{
  "id_token": "eyJhbGciOiJSUzI1NiIsImtpZCI..."
}
```

**Response** (201 ok - requiere 2FA):
```json
{
  "status": "requires_2fa",
  "temp_token": "gPvYb-tOL1aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567",
  "totp_qr_code": "data:image/png;base64,iVBORw0KGgoAAAANS..."  // null si ya tiene TOTP
}
```

**Response** (401 - token inválido):
```json
{
  "detail": "Google token inválido: ..."
}
```

---

### 2. `POST /api/v1/auth/verify-totp`
**Descripción**: Verifica código TOTP con temp_token. Retorna tokens finales si es válido.

**Request**:
```json
{
  "temp_token": "gPvYb-tOL1aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567",
  "totp_code": "123456"
}
```

**Response** (200 ok):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "rol": "alumno",
  "redirect_url": "/dashboard"
}
```

**Cookies Set**:
```
Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Strict; Max-Age=28800
Set-Cookie: access_token=...; Secure; SameSite=Strict; Max-Age=900
```

**Response** (401 - totp inválido):
```json
{
  "detail": "Código TOTP inválido"
}
```

---

## Variables de Configuración Requeridas

Agregar al archivo `.env` en la carpeta `backend/`:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com

# La aplicación requiere google-auth y qrcode instalados
# Estos se instalan automáticamente con: pip install -r requirements.txt
```

### Cómo obtener GOOGLE_CLIENT_ID:

1. Ir a [Google Cloud Console](https://console.cloud.google.com/)
2. Crear un nuevo proyecto
3. Habilitar "Google+ API"
4. Crear credenciales → OAuth 2.0 → Web Application
5. Autorizar URIs:
   - JavaScript origins: `http://localhost:3000` (desarrollo), `https://tucio.dominio.com` (producción)
   - Authorized redirect URIs: `http://localhost:3000/auth/google/callback`, etc.
6. Copiar el "Client ID" y pegarlo en `.env`

---

## Cambios en la Base de Datos

### Nuevas Columnas en `usuarios`
- `password_hash`: Ahora **nullable** (para usuarios con Google login)
- `is_google_login`: Boolean, indica si es login por Google

### Nueva Tabla: `pre_auth_tokens`
```sql
CREATE TABLE pre_auth_tokens (
    id SERIAL PRIMARY KEY,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    id_matricula VARCHAR(20) NOT NULL REFERENCES usuarios(id_matricula) ON DELETE CASCADE,
    expira_en TIMESTAMP WITH TIME ZONE NOT NULL,
    usado BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_pre_auth_tokens_token_hash ON pre_auth_tokens(token_hash);
```

---

## Aplicar Migraciones

```bash
# Desde la carpeta backend/
cd backend

# Aplicar migraciones
alembic upgrade head
```

---

## Nuevos Modelos en ORM

### `PreAuthToken`
```python
# Archivo: app/models/pre_auth_token.py
class PreAuthToken(Base):
    __tablename__ = "pre_auth_tokens"
    
    id: int (PK)
    token_hash: str(64) - Hash SHA256 del temp_token
    id_matricula: str(20) - FK a usuarios
    expira_en: datetime - Válido por 10 minutos
    usado: bool - Marca si ya fue consumido
    created_at: datetime - Timestamp de creación
```

---

## Nuevos Schemas Pydantic

### `GoogleAuthRequest`
Recibe id_token de Google

### `PreAuthResponse`
Retorna temp_token + QR code (si aplica)

### `VerifyTOTPRequest`
Recibe temp_token + totp_code

### `RoleRedirectResponse`
Retorna access_token + rol + redirect_url

---

## Flujo de Seguridad

1. **Google ID Token Validation**
   - Se valida firma del token con servidores de Google
   - Se verifica que email está verificado
   - Se verifica audiencia (GOOGLE_CLIENT_ID)

2. **Pre-Auth Token (Temp Token)**
   - Token de 32 bytes (URL-safe) aleatorio
   - Se hashea con SHA256 antes de guardarse en DB
   - Expira en 10 minutos
   - Se marca como "usado" tras consumirse

3. **TOTP Validation**
   - Código de 6 dígitos basado en tiempo
   - Algoritmo: TOTP-SHA1 (estándar RFC 6238)
   - Genera QR para vincular a Authenticator en primera sesión

---

## Novedades en Funciones de Seguridad

### `app/core/security.py`

Nuevas funciones:
```python
generate_pre_auth_token() -> str
hash_pre_auth_token(raw_token: str) -> str
validate_google_token(id_token: str) -> dict
```

---

## Servicio de Autenticación

### `app/services/auth_service.py`

Nuevas funciones:
```python
async login_or_register_google(
    db: AsyncSession,
    id_token: str,
    ip_origen: str | None = None,
) -> tuple[str, str | None]
# Retorna: (temp_token, totp_qr_code)

async verify_totp_and_get_token(
    db: AsyncSession,
    temp_token: str,
    totp_code: str,
    ip_origen: str | None = None,
) -> tuple[str, str, str, str]
# Retorna: (access_token, raw_refresh, rol, redirect_url)
```

---

## Router de Autenticación

### `app/routers/auth.py`

Nuevos endpoints:
- `POST /api/v1/auth/google` - Inicia sesión con Google
- `POST /api/v1/auth/verify-totp` - Verifica TOTP y obtiene tokens finales

---

## Dependencias Nuevas en `pyproject.toml`

```toml
"google-auth>=2.27.0"
"qrcode[pil]>=7.4.0"
```

Instalar con:
```bash
cd backend
pip install google-auth qrcode[pil]
# o con uv:
uv pip install google-auth qrcode[pil]
```

---

## Pruebas Manuales

### Test 1: Login con Google válido
```bash
curl -X POST http://localhost:8000/api/v1/auth/google \
  -H "Content-Type: application/json" \
  -d '{"id_token": "copy_your_google_token_here"}'
```

### Test 2: Verificar TOTP
```bash
curl -X POST http://localhost:8000/api/v1/auth/verify-totp \
  -H "Content-Type: application/json" \
  -d '{
    "temp_token": "copy_temp_token_from_test1",
    "totp_code": "123456"
  }'
```

---

## Notas Importantes

1. **Password Hash Nullable**: La columna `password_hash` en `usuarios` ahora es nullable. Los usuarios con `is_google_login=true` pueden tener `password_hash=NULL`.

2. **TOTP Obligatorio**: Todos los usuarios (Google o no) deben completar TOTP antes de recibir el token final. No hay bypass.

3. **Registro Automático**: Si un usuario accede por Google por primera vez, se crea automáticamente en la BD con rol="alumno" por defecto.

4. **QR Code Base64**: El QR code se retorna como data URL base64 para que el frontend lo pueda mostrar directamente.

5. **Refresh Token Persistence**: El refresh token se guarda en cookie HttpOnly y también se retorna en la respuesta JSON (por si el frontend lo necesita).

---

## Frontend: Próximos Pasos

El frontend debe:

1. Integrar Google OAuth SDK
2. Obtener id_token del usuario
3. Enviar a `/api/v1/auth/google`
4. Si response === "requires_2fa":
   - Mostrar QR code si `totp_qr_code` no es null
   - Pedir al usuario que escanee con Authenticator
   - Luego pedir código de 6 dígitos
5. Enviar temp_token + totp_code a `/api/v1/auth/verify-totp`
6. Guardar access_token y redirigir a `redirect_url` según rol

---
