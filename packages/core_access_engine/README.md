# core-access-engine

Motor criptográfico y de identidad **reutilizable e independiente del dominio de negocio**.

Diseñado para ser el núcleo de seguridad compartido en una familia de aplicaciones SaaS: feria de servicios sociales, sistema de barbería, y cualquier proyecto futuro que necesite autenticación robusta sin reescribir la misma lógica de seguridad.

---

## ¿Qué problema resuelve?

Cuando se construyen múltiples productos (o múltiples clientes en un modelo SaaS), el código de autenticación y criptografía tiende a duplicarse. Cada copia diverge: una versión corrige un bug de timing attack, otra no. Una tiene TOTP, la otra no.

`core-access-engine` extrae toda esa lógica en un único paquete versionado. Cada proyecto lo instala como dependencia y hereda automáticamente todas las correcciones de seguridad con solo actualizar la versión.

```
┌────────────────────────────────────────────────────────┐
│                  core-access-engine                     │
│  crypto · totp · jwt · passwords · sms_otp · tokens    │
│  google_auth · secrets · middleware · limiter · logging │
└──────────────┬──────────────────────────┬──────────────┘
               │                          │
    ┌──────────▼────────┐      ┌──────────▼──────────┐
    │  feria-social-app │      │  barberia-app        │
    │  (FastAPI + EC2)  │      │  (FastAPI + Lambda?) │
    └───────────────────┘      └─────────────────────-┘
```

---

## Módulos

| Módulo | Responsabilidad |
|---|---|
| `config` | `CoreSettings` — clase base Pydantic para toda configuración |
| `crypto` | Cifrado/descifrado Fernet (AES-128-CBC + HMAC-SHA256) para QR dinámico |
| `totp` | TOTP RFC 6238 — generación de secretos, QR, verificación |
| `jwt_manager` | Emisión y validación de JWT (access token + pre-auth token) |
| `passwords` | Hash y verificación de contraseñas con bcrypt |
| `tokens` | Refresh tokens, pre-auth tokens, nonces (opaque + SHA-256) |
| `google_auth` | Validación criptográfica de `id_token` Google OAuth 2.0 |
| `sms_otp` | OTP por SMS — generación segura, hashing, envío (Twilio / AWS SNS) |
| `secrets` | Abstracción de fuente de secretos (variables de entorno / AWS SSM) |
| `middleware` | Security headers HTTP: CSP, HSTS, X-Frame-Options, Permissions-Policy |
| `limiter` | Fábrica de rate limiter SlowAPI con backend Redis o en memoria |
| `logging` | Logging estructurado JSON (structlog) + integración Sentry |

---

## Instalación

### En desarrollo (monorepo o local)

```bash
pip install -e ./packages/core_access_engine
# Con soporte Twilio para SMS:
pip install -e "./packages/core_access_engine[twilio]"
```

### En producción (referencia por Git tag)

```bash
# Sin extras
pip install "core-access-engine @ git+https://github.com/tu-org/core-access-engine.git@v0.2.0"

# Con Twilio
pip install "core-access-engine[twilio] @ git+https://github.com/tu-org/core-access-engine.git@v0.2.0"
```

### En `requirements.txt` o `pyproject.toml` del proyecto consumidor

```toml
# pyproject.toml del proyecto
dependencies = [
    "core-access-engine @ git+https://github.com/tu-org/core-access-engine.git@v0.2.0",
    "fastapi>=0.136.0",
    "sqlalchemy>=2.0.0",
    # ... dependencias propias del proyecto
]
```

### En Dockerfile (repositorio privado)

```dockerfile
ARG GITHUB_TOKEN
RUN pip install \
    "core-access-engine @ git+https://${GITHUB_TOKEN}@github.com/tu-org/core-access-engine.git@v0.2.0"
```

---

## Inicio rápido

### 1. Configuración

Hereda `CoreSettings` y agrega los campos propios de tu proyecto:

```python
# tu_app/core/config.py
from core_access_engine.config import CoreSettings

class Settings(CoreSettings):
    # Campos específicos de tu app
    DATABASE_URL: str
    APP_NAME: str = "MiApp"

settings = Settings()
```

`CoreSettings` lee automáticamente desde variables de entorno o AWS SSM (en producción). Los campos disponibles incluyen `JWT_SECRET_KEY`, `QR_ENCRYPTION_KEY`, `GOOGLE_CLIENT_ID`, `REDIS_URL`, `SENTRY_DSN`, `TWILIO_*`, y más. Ver `config.py` para la referencia completa.

### 2. JWT

```python
from core_access_engine.jwt_manager import create_access_token, decode_access_token

token = create_access_token(
    data={"sub": str(user.id), "rol": user.rol},
    secret=settings.JWT_SECRET_KEY,
    expire_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
)

payload = decode_access_token(token, secret=settings.JWT_SECRET_KEY)
```

### 3. Contraseñas

```python
from core_access_engine.passwords import hash_password, verify_password

hashed = hash_password("contraseña_del_usuario")
is_valid = verify_password("contraseña_ingresada", hashed)
```

### 4. TOTP (autenticador)

```python
from core_access_engine.totp import (
    generate_totp_secret, generate_totp_qr_url, verify_totp
)

secret = generate_totp_secret()
qr_url = generate_totp_qr_url(secret, account="user@email.com", issuer="MiApp")
is_valid = verify_totp(code_from_user, secret)
```

### 5. SMS OTP

```python
from core_access_engine.sms_otp import (
    generate_sms_code, hash_sms_code, verify_sms_code,
    send_sms_code, TwilioSmsProvider
)

# Al iniciar flujo de auth
code = generate_sms_code()          # "847291"
stored = hash_sms_code(code)        # guardar en DB con TTL 10 min
provider = TwilioSmsProvider(
    account_sid=settings.TWILIO_ACCOUNT_SID,
    auth_token=settings.TWILIO_AUTH_TOKEN,
    from_number=settings.TWILIO_FROM_NUMBER,
)
send_sms_code(phone="+5218001234567", code=code, provider=provider, app_name="MiApp")

# Cuando el usuario envía el código
is_valid = verify_sms_code(code_from_user, stored_hash_from_db)
```

### 6. Google OAuth 2.0

```python
from core_access_engine.google_auth import validate_google_id_token, GoogleAuthError

try:
    user_data = validate_google_id_token(id_token, client_id=settings.GOOGLE_CLIENT_ID)
    email = user_data["email"]
except GoogleAuthError as e:
    raise HTTPException(status_code=401, detail=str(e))
```

### 7. QR dinámico cifrado

```python
from core_access_engine.crypto import encrypt_qr_payload, decrypt_qr_payload

payload = f"{empresa_id}:{evento_id}:{timestamp}"
token = encrypt_qr_payload(payload, key=settings.QR_ENCRYPTION_KEY)
original = decrypt_qr_payload(token, key=settings.QR_ENCRYPTION_KEY)
```

### 8. Security headers + Rate limiting (FastAPI)

```python
from fastapi import FastAPI
from core_access_engine.middleware import add_security_headers_middleware
from core_access_engine.limiter import build_limiter

app = FastAPI()

add_security_headers_middleware(app, app_env=settings.APP_ENV)

limiter = build_limiter(redis_url=settings.REDIS_URL)
app.state.limiter = limiter
```

---

## Principios de diseño

**Sin acoplamiento a settings globales.** Todos los módulos reciben los valores de configuración como parámetros explícitos (`secret`, `key`, `algorithm`, etc.). La app consumidora pasa `settings.JWT_SECRET_KEY` al llamar la función. Esto permite:
- Testar sin instanciar `Settings`
- Usar múltiples claves simultáneamente (ej. rotación de secretos)
- Sustituir cualquier módulo de forma independiente

**Sin lógica de negocio.** El paquete no sabe nada de usuarios, base de datos, roles ni dominios. Solo criptografía, tokens y transporte de mensajes. La lógica de negocio (quién puede hacer qué) vive en cada app consumidora.

**Dependencias mínimas.** Solo lo estrictamente necesario. FastAPI, SQLAlchemy, Alembic y drivers de base de datos quedan fuera — los trae cada proyecto que los necesite.

---

## Seguridad

- Generación de códigos con `secrets` (CSPRNG) — nunca `random`
- Contraseñas con bcrypt (factor de trabajo ≥ 12)
- Tokens opacos con `secrets.token_urlsafe(32)` + SHA-256 para almacenamiento en DB
- Comparaciones de hashes con `secrets.compare_digest` (anti-timing attacks)
- JWT con expiración corta (15 min access, 7 días refresh)
- Pre-auth tokens con tipo verificado (`"type": "pre_auth"`) para evitar reúso de tokens

Reportar vulnerabilidades de seguridad de forma privada antes de abrir un issue público.

---

## Versiones

| Versión | Descripción |
|---|---|
| `v0.1.0` | Módulos base: crypto, totp, jwt, passwords, tokens, google_auth, secrets, middleware, limiter, logging |
| `v0.2.0` | Agrega `sms_otp` (Twilio + AWS SNS), campos SMS en `CoreSettings` |

---

## Requisitos

- Python **3.12+**
- Para `sms_otp` con Twilio: instalar con extra `[twilio]`
- Para `sms_otp` con AWS SNS: `boto3` ya incluido, requiere IAM Role con `sns:Publish`
- Para `secrets` con AWS SSM en producción: IAM Role con `ssm:GetParametersByPath`
