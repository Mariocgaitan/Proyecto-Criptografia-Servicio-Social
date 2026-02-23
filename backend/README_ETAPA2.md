# Guía de Etapa 2 — Login, JWT y Seguridad

Esta etapa implementa el flujo completo de autenticación con tokens JWT y protecciones de seguridad.

## ¿Qué se agregó?

### Nuevas tablas en DB
- **`refresh_tokens`** — almacena el hash SHA-256 del refresh token de cada sesión
- **`logs_auditoria`** — registra eventos de seguridad (login exitoso, fallido, logout)

### Nuevos endpoints
| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/login` | Formulario HTML de login |
| `POST` | `/login` | Procesa el login → redirige al dashboard |
| `GET` | `/logout` | Cierra sesión y borra cookies |
| `GET` | `/dashboard` | Dashboard placeholder (Etapa 3) |
| `POST` | `/api/v1/auth/login` | Login JSON → retorna `access_token` |
| `POST` | `/api/v1/auth/refresh` | Renueva el access token con la cookie |
| `POST` | `/api/v1/auth/logout` | Revoca el refresh token |

### Lógica de sesión
- **Access Token (JWT):** dura 15 min, viaja en cookie no-HttpOnly para que JS lo lea
- **Refresh Token:** dura 8 horas, cookie `HttpOnly + SameSite=Strict`, hash en DB

### Seguridad
- bcrypt para contraseñas
- SHA-256 para refresh tokens en DB
- Rate limiting con `slowapi`
- Security headers HTTP: `CSP`, `X-Frame-Options`, `X-Content-Type-Options`, `Permissions-Policy`, `Cache-Control`

---

## Pasos para correr el branch

```bash
git checkout feature/etapa-2-login-jwt

# Instalar dependencias
uv sync

# Aplicar migraciones (crea refresh_tokens y logs_auditoria)
uv run alembic upgrade head

# Poblar datos iniciales (eventos + padrón)
uv run python seed.py

# Levantar el servidor
uv run uvicorn app.main:app --reload --port 8000
```

> **Requisito:** Tener Docker corriendo con `docker compose up -d` antes de levantar el servidor.

---

## Variables de entorno requeridas (`.env`)

```env
DATABASE_URL=postgresql+asyncpg://sid_user:sid_password_local@localhost:5432/sid_db
JWT_SECRET_KEY=dev_local_secret_key_change_in_production_please
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_HOURS=8
APP_ENV=development
DEBUG=true
```

---

## Flujo de prueba

1. Abre `http://localhost:8000/registro` y registra un alumno con una matrícula del padrón (ej. `A03459128`)
2. Ve a `http://localhost:8000/login` e inicia sesión con ese usuario
3. Deberías llegar al dashboard con el estado de sesión activa
4. Prueba cerrar sesión con el botón "Cerrar sesión"
5. Prueba el endpoint de refresh: `POST http://localhost:8000/api/v1/auth/refresh` (con la cookie activa)

---

Cualquier duda, avísame.
