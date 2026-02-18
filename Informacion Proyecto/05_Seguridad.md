# 05 — Seguridad del Sistema

## 1. Modelo de Amenazas

| Amenaza | Vector | Mitigación Implementada |
|---|---|---|
| Suplantación de identidad con QR estático | Compartir imagen de QR | TOTP: el código expira en 30 segundos |
| Robo de Access Token JWT | XSS, interceptación | Tokens de 15 min de duración + Refresh Token en cookie HttpOnly |
| Doble inscripción (race condition) | Dos escaneos simultáneos | `SELECT ... FOR UPDATE` + UNIQUE constraint en DB |
| Fuerza bruta en login | Múltiples intentos de password | Rate limiting en `/auth/login` |
| Exposición del TOTP secret | Respuesta de API | El secret **nunca** sale del servidor |
| Acceso no autorizado a escáner | URL directa | Autenticación requerida para el módulo empresa |
| Inyección SQL | Inputs maliciosos | SQLAlchemy ORM con parámetros vinculados |

---

## 2. Autenticación y Sesiones

### 2.1 Estrategia de Tokens Dual

```
┌─────────────────────────────────────────────────────────────┐
│                    ESTRATEGIA DE TOKENS                      │
│                                                              │
│  ACCESS TOKEN (JWT)          REFRESH TOKEN                   │
│  ─────────────────           ─────────────                   │
│  • Duración: 15 minutos      • Duración: 8 horas             │
│  • Viaja en: Header HTTP     • Viaja en: Cookie HttpOnly     │
│  • Almacenado en: Memoria JS • Almacenado en: DB (hash)      │
│  • Revocable: No (expira)    • Revocable: Sí (logout)        │
│  • Payload: {sub, rol, exp}  • Formato: UUID aleatorio       │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Configuración de la Cookie del Refresh Token

```python
response.set_cookie(
    key="refresh_token",
    value=refresh_token,
    httponly=True,      # No accesible por JavaScript
    secure=True,        # Solo HTTPS
    samesite="strict",  # Protección CSRF
    max_age=28800       # 8 horas en segundos
)
```

### 2.3 Flujo de Renovación de Sesión

```
[Access Token expira]
       │
       ▼
Browser envía automáticamente cookie con Refresh Token
       │
       ▼
Backend verifica: ¿token en DB? ¿no revocado? ¿no expirado?
       │
   ┌───┴───┐
  SÍ      NO
   │       │
   ▼       ▼
Nuevo    HTTP 401 → Redirigir a login
Access
Token
```

---

## 3. Criptografía TOTP (RFC 6238)

### 3.1 Generación del Secreto

```python
import pyotp

# Al registrar al alumno (una sola vez, guardado en DB)
totp_secret = pyotp.random_base32()  # 32 caracteres Base32
# Ejemplo: "JBSWY3DPEHPK3PXP"
```

### 3.2 Generación del Código (Servidor)

```python
# En el endpoint GET /api/v1/alumno/qr-payload
totp = pyotp.TOTP(usuario.totp_secret)
codigo_actual = totp.now()  # Ej: "482931"
tiempo_restante = 30 - (int(time.time()) % 30)
```

### 3.3 Verificación del Código (Servidor)

```python
# En el endpoint POST /api/v1/inscripciones/validar
totp = pyotp.TOTP(usuario.totp_secret)
es_valido = totp.verify(
    otp=totp_leido,
    valid_window=1  # Acepta código actual y el anterior (±30s)
)
```

> **Justificación de `valid_window=1`:** Se permite una ventana de ±30 segundos para tolerar pequeñas diferencias de reloj entre dispositivos o demoras en el escaneo. Esto no compromete la seguridad de forma significativa dado el contexto del evento.

### 3.4 Payload del QR

El QR contiene únicamente:
```json
{"matricula": "A01234567", "totp": "482931"}
```

**El `totp_secret` NUNCA se incluye en el QR ni en ninguna respuesta de API.**

---

## 4. Hashing de Contraseñas

```python
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Al registrar
password_hash = pwd_context.hash(password_plano)

# Al verificar login
es_correcto = pwd_context.verify(password_plano, password_hash_db)
```

**bcrypt** es el estándar de la industria para hashing de contraseñas. Es intencionalmente lento (factor de costo configurable), lo que hace inviable los ataques de fuerza bruta masiva.

---

## 5. Rate Limiting

Se implementa rate limiting en los endpoints más sensibles usando `slowapi` (wrapper de `limits` para FastAPI):

| Endpoint | Límite | Ventana |
|---|---|---|
| `POST /auth/login` | 10 intentos | Por minuto, por IP |
| `POST /auth/registro` | 5 intentos | Por minuto, por IP |
| `POST /inscripciones/validar` | 30 intentos | Por minuto, por IP |
| `GET /alumno/qr-payload` | 10 intentos | Por minuto, por usuario |

**Respuesta al exceder el límite:** `HTTP 429 Too Many Requests`

---

## 6. Auditoría y Logging

Todos los eventos de seguridad se registran en la tabla `LogsAuditoria`:

| Tipo de Evento | Cuándo se registra |
|---|---|
| `LOGIN_EXITOSO` | Login correcto |
| `LOGIN_FALLIDO` | Password incorrecto |
| `REGISTRO_NUEVO` | Nuevo alumno registrado |
| `TOTP_INVALIDO` | Código QR expirado o incorrecto |
| `INSCRIPCION_OK` | Inscripción completada exitosamente |
| `INSCRIPCION_ESPERA` | Alumno agregado a lista de espera |
| `CUPO_LLENO` | Intento de inscripción con proyecto lleno |
| `YA_INSCRITO` | Intento de doble inscripción |
| `LOGOUT` | Cierre de sesión |
| `TOKEN_INVALIDO` | Intento con JWT inválido o expirado |

---

## 7. Protección contra Race Conditions

El endpoint `/inscripciones/validar` es el más crítico. Con ~1000 alumnos y ~60 proyectos, es posible que múltiples escaneos del mismo proyecto ocurran simultáneamente.

**Solución: Bloqueo Pesimista a Nivel de Fila**

```sql
-- Dentro de la transacción
SELECT * FROM proyectos 
WHERE id_proyecto = :id_proyecto 
FOR UPDATE;  -- Bloquea la fila hasta el COMMIT
```

Esto garantiza que si dos solicitudes llegan simultáneamente para el mismo proyecto:
1. La primera adquiere el bloqueo y procede.
2. La segunda **espera** hasta que la primera haga COMMIT.
3. La segunda entonces lee el cupo actualizado y toma la decisión correcta.

**Combinado con el UNIQUE constraint** en `Inscripciones.id_matricula`, el sistema tiene **dos capas de protección** contra dobles inscripciones.

---

## 8. Variables de Entorno (`.env`)

```env
# Base de datos
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/sid_db

# JWT
JWT_SECRET_KEY=<string_aleatorio_256_bits>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_HOURS=8

# Aplicación
APP_ENV=production
ALLOWED_ORIGINS=https://tu-dominio.com
```

> **Crítico:** El archivo `.env` debe estar en `.gitignore` y **nunca** subirse al repositorio.

---

## 9. Validaciones de Input

| Campo | Validación |
|---|---|
| `correo` | Regex: debe terminar en `@tec.mx` |
| `matricula` | Regex: formato `A0XXXXXXX` (A0 + 7 dígitos) |
| `semestre` | Integer entre 1 y 12 |
| `password` | Mínimo 8 caracteres |
| `totp_leido` | Exactamente 6 dígitos numéricos |
| `id_proyecto` | Integer positivo, debe existir en DB |

Todas las validaciones se implementan con **Pydantic** en los schemas (`schemas.py`), aprovechando la integración nativa de FastAPI.
