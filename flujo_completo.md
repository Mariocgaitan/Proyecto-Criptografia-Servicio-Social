# Desglose Técnico — Feria Servicio Social
> **Propósito de este documento:** Dar contexto completo a una IA para que redacte bullets de CV precisos, orientados a impacto y con terminología técnica real del proyecto.

---

## 1. ¿Qué es el proyecto?

Plataforma web **full-stack** que digitaliza la vinculación entre alumnos universitarios y empresas en la **Feria de Servicio Social del Tecnológico de Monterrey**. Reemplaza un proceso manual en papel con:

- Registro y autenticación segura (Google OAuth + 2FA/TOTP)
- Generación de **QR dinámico cifrado** (se regenera cada 30 segundos, no falsificable)
- Escaneo del QR por empresas para inscribir alumnos en proyectos en tiempo real
- Panel de administración con estadísticas, exportación de reportes y métricas del sistema
- Despliegue automatizado en la nube (AWS EC2 + Docker + CI/CD)

**URL en producción:** `https://feriaserviciosocial.com`

---

## 2. Stack Tecnológico Completo

### Backend
| Herramienta | Versión | Rol en el proyecto |
|---|---|---|
| **Python** | 3.12 | Lenguaje principal del backend |
| **FastAPI** | 0.136 | Framework async para la API REST |
| **Uvicorn** | 0.44 | Servidor ASGI (dev) |
| **Gunicorn** | 25.3 | Process manager (producción, workers) |
| **SQLAlchemy** | 2.0 | ORM async con tipado fuerte |
| **Asyncpg** | 0.31 | Driver async nativo para PostgreSQL |
| **Alembic** | 1.18 | Migraciones de base de datos versionadas y reversibles |
| **Pydantic v2** | 2.13 | Validación y serialización de datos (schemas) |
| **Pydantic-Settings** | 2.13 | Gestión de configuración desde env vars |
| **PyJWT** | 2.12 | Generación y verificación de JSON Web Tokens |
| **bcrypt** | 5.0 | Hashing seguro de contraseñas |
| **pyotp** | 2.9 | Generación y verificación de TOTP (Google Authenticator) |
| **cryptography / Fernet** | 46.0 | Cifrado simétrico AES-128-CBC + HMAC-SHA256 para QR |
| **qrcode + Pillow** | 8.2 / 12.2 | Generación de imágenes QR en el servidor |
| **Redis** | 7.x | Caché (catálogos, rate limiting, sesiones) |
| **redis-py** | 7.4 | Cliente async de Redis para Python |
| **SlowAPI** | 0.1.9 | Rate limiting por IP en endpoints críticos |
| **boto3** | 1.42 | SDK de AWS para cargar secretos desde Parameter Store |
| **paramiko + sshtunnel** | 2.12 / 0.4 | Túnel SSH cifrado hacia base de datos remota |
| **structlog** | 25.5 | Logging estructurado en JSON (production-grade) |
| **Sentry SDK** | 2.58 | Monitoreo de errores en producción (APM) |
| **google-auth** | 2.49 | Validación de tokens ID de Google OAuth 2.0 |
| **Jinja2** | 3.1 | Templates para correos HTML |
| **python-multipart** | 0.0.26 | Soporte para form data (uploads) |
| **uv** | latest | Gestor de dependencias ultrarrápido (reemplazo de pip) |

### Frontend
| Herramienta | Versión | Rol en el proyecto |
|---|---|---|
| **React** | 19 | Framework de UI basado en componentes |
| **Vite** | 7.x | Bundler y dev server (HMR instantáneo) |
| **React Router DOM** | 7.x | Enrutamiento SPA con rutas protegidas |
| **Tailwind CSS** | 3.4 | Utility-first CSS framework |
| **shadcn/ui** | 4.x | Componentes UI accesibles sobre Radix UI |
| **Radix UI** | - | Primitivos UI headless (Tabs, Separator) |
| **Framer Motion / Motion** | 12.x | Animaciones declarativas y transiciones |
| **Recharts** | 2.15 | Gráficas interactivas (barras, líneas, área) |
| **qrcode.react** | 4.2 | Renderizado de QR en el cliente |
| **html5-qrcode** | 2.3 | Acceso a cámara y lectura de QR (escáner empresa) |
| **@react-oauth/google** | 0.13 | Botón de Google Sign-In y flujo OAuth |
| **jsPDF + jspdf-autotable** | 2.5 / 3.8 | Exportación de reportes a PDF desde el browser |
| **input-otp** | 1.4 | Input accesible para códigos TOTP de 6 dígitos |
| **lucide-react** | 0.577 | Librería de iconos SVG |
| **Geist Font** | - | Tipografía moderna (Variable font de Vercel) |
| **class-variance-authority** | 0.7 | Variantes de componentes type-safe |
| **Vitest** | 4.x | Test runner compatible con Vite |
| **@testing-library/react** | 16.x | Testing de componentes React |
| **ESLint** | 9.x | Linter con reglas de React Hooks y React Refresh |
| **TypeScript** | 6.x | Tipado estático (tsconfig presente) |

### Infraestructura y DevOps
| Herramienta | Rol en el proyecto |
|---|---|
| **Docker** | Contenedorización de la app (multi-stage build) |
| **Docker Compose** | Orquestación local (dev) y producción (prod) |
| **Nginx 1.27-alpine** | Reverse proxy, servir SPA, SSL termination |
| **Cloudflare** | CDN, proxy HTTPS, protección DDoS, DNS |
| **AWS EC2** | Servidor de producción con Elastic IP |
| **AWS Parameter Store (SSM)** | Almacén de secretos en producción (nunca en repo) |
| **GitHub Actions** | Pipeline CI/CD automático |
| **GHCR (GitHub Container Registry)** | Registro de imágenes Docker |
| **GitHub Secrets** | Variables sensibles del pipeline (SSH key, PATs) |
| **PostgreSQL** | Base de datos relacional principal |
| **SSH Tunnel (sshtunnel)** | Conexión cifrada a Postgres remoto |

---

## 3. Arquitectura del Sistema

```
Cliente (Browser)
    │ HTTPS
    ▼
Cloudflare (CDN + DDoS + DNS)
    │ HTTP (Flexible TLS)
    ▼
EC2:80/443 → Nginx (Reverse Proxy)
    │
    ├──▶ /api/*  → FastAPI app:8000 (Gunicorn + Uvicorn workers)
    │                   │
    │                   ├──▶ Redis (caché, rate limiting)
    │                   └──▶ PostgreSQL (vía SSH Tunnel)
    │
    └──▶ /*      → React SPA (archivos estáticos servidos por FastAPI)
```

**Patrón de despliegue:** La imagen Docker contiene tanto el backend Python como el frontend React compilado. FastAPI sirve los estáticos del SPA con un handler de fallback `index.html` para el client-side routing.

---

## 4. Seguridad — Técnicas y Mecanismos Implementados

### 4.1 Autenticación Multi-Factor (MFA / 2FA)

| Capa | Técnica | Implementación |
|---|---|---|
| **Identidad primaria** | Google OAuth 2.0 (OIDC) | `google-auth` valida la firma criptográfica del `id_token` contra los certificados públicos de Google |
| **Anti-replay OAuth** | Nonce criptográfico | UUID4 generado server-side, hasheado con SHA-256, guardado en DB con TTL de 5 min. El nonce viaja en el request a Google y regresa embebido en el `id_token`. Solo se puede usar una vez. |
| **2FA / TOTP** | RFC 6238 (Time-based OTP) | `pyotp` genera y verifica códigos de 6 dígitos que expiran cada 30 segundos. El `totp_secret` **nunca sale del servidor**. |
| **Configuración TOTP** | QR de onboarding | Al primer login, se genera un QR con el `otpauth://` URL para registrar en Google Authenticator. |
| **Sesión** | JWT Access + Refresh Token | Access Token: cookie HttpOnly/Secure, vida corta. Refresh Token: generado con `secrets.token_urlsafe(32)`, guardado como hash SHA-256 en DB, vida de 8 horas. |
| **Revocación** | Hash en DB | El Refresh Token se puede invalidar en logout borrando el hash; el raw token nunca se guarda. |
| **Pre-auth token** | JWT de corta vida (15 min) | Emitido entre la validación de identidad y la verificación TOTP, permite completar el wizard en pasos. |

### 4.2 Cifrado del QR Dinámico

```
Payload: { "matricula": "A01234567", "totp": "847291", "id_evento": 3 }
    │
    ▼
Fernet.encrypt(payload_json, key=FERNET_SECRET_KEY)
    │  AES-128-CBC + HMAC-SHA256 + timestamp interno
    ▼
Base64-URL-safe string
    │
    ▼
qrcode.react → imagen PNG en el browser
```

- El **TOTP** dentro del payload hace que el contenido del QR sea diferente cada 30 segundos.
- Aunque alguien fotografíe el QR, el contenido está cifrado y el TOTP habrá expirado.
- El **Fernet** (de la librería `cryptography`) provee cifrado autenticado: si el ciphertext es alterado, la descifración falla con `InvalidToken`.

### 4.3 Protecciones Adicionales

| Protección | Implementación |
|---|---|
| **Rate Limiting** | `SlowAPI` + Redis: 10 req/min/IP en `/api/auth/`, límite separado en `/api/empresa/escanear` |
| **Brute-force lockout** | Contador de intentos fallidos en DB; bloqueo temporal de cuenta tras N errores |
| **HTTP Security Headers** | Middleware custom en FastAPI: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy |
| **Content Security Policy** | CSP distinto para dev vs prod (prod usa hashes SHA-256 de scripts inline) |
| **CORS configurado** | Lista blanca de orígenes; regex para LAN solo en dev |
| **Constraint único en DB** | `UNIQUE(id_matricula, id_evento)` garantiza inscripción única a nivel de base de datos |
| **Inscripción idempotente** | Validación en lógica de aplicación + constraint DB como doble garantía |
| **Log de auditoría** | Tabla `log_auditoria` con tipo de evento, matrícula, IP, timestamp para cada acción crítica |
| **Secretos en AWS SSM** | Las credenciales nunca existen en el repositorio; se cargan en runtime desde Parameter Store |
| **SSH Tunnel** | Conexión a Postgres remoto a través de túnel SSH cifrado (`paramiko` + `sshtunnel`) |
| **Request ID** | Cada request recibe un UUID4 único (`X-Request-ID`); propagado en headers y logs para trazabilidad end-to-end |

---

## 5. Diseño de Base de Datos

### Entidades principales (modelos SQLAlchemy)

| Modelo | Descripción |
|---|---|
| `Usuario` | Alumno, Empresa o Admin. Campos: matrícula, correo, contraseña (bcrypt), `totp_secret`, intentos fallidos, timestamps |
| `PadronAlumno` | Catálogo precargado por admin: matrícula + nombre + carrera + semestre |
| `Evento` | Periodo académico (INVIERNO/FEB_JUN/etc + año) |
| `Empresa` | Organización participante |
| `Proyecto` | Oportunidad ofrecida por empresa en un evento; tiene `capacidad_max` y `cupo_actual` |
| `Inscripcion` | Relación alumno↔proyecto con UUID único; UNIQUE(id_alumno, id_evento) |
| `UsuarioEvento` | Alumno selecciona 1 o 2 eventos al registrarse |
| `RefreshToken` | Hash del refresh token + expiry + IP |
| `PreAuthToken` | Token temporal para el wizard de autenticación |
| `GoogleNonce` | Nonce hasheado con TTL para anti-replay OAuth |
| `TempTotpSecret` | TOTP secret temporal durante registro antes de confirmar |
| `LogAuditoria` | Registro de todas las acciones críticas |
| `RequestMetric` | Métricas de latencia por endpoint para el dashboard de sistema |

### Patrón de migraciones
- **Alembic** con versionado (`upgrade`/`downgrade` reversibles)
- Migraciones se ejecutan automáticamente en el pipeline CI/CD después del deploy
- `alembic upgrade head` se corre dentro del contenedor en producción

---

## 6. API REST — Endpoints por Dominio

### Auth (`/api/v1/auth/`)
- `POST /login` — Login email+password + TOTP
- `POST /google/nonce` — Genera nonce para OAuth
- `POST /google/callback` — Valida id_token + nonce + inicia wizard TOTP
- `POST /totp/verify` — Verifica código TOTP y emite JWT de sesión
- `POST /refresh` — Renueva Access Token usando Refresh Token
- `POST /logout` — Revoca Refresh Token en DB

### Alumno (`/api/v1/alumno/`)
- `GET /dashboard` — Datos del alumno, eventos, proyectos disponibles
- `GET /qr-payload` — Genera y devuelve el payload Fernet cifrado para el QR
- `PATCH /perfil` — Actualiza correo alterno, celular, descripción

### Empresa (`/api/v1/empresa/`)
- `POST /escanear` — Descifra QR, verifica TOTP, valida reglas de negocio, inscribe alumno
- `GET /inscritos` — Lista alumnos inscritos con datos de contacto
- `DELETE /inscripcion/{id}` — Baja de inscripción con log de auditoría

### Admin (`/api/v1/admin/`)
- CRUD de eventos, empresas, proyectos, padrón de alumnos
- `GET /logs` — Log de auditoría con filtros y paginación

### Estadísticas (`/api/v1/estadisticas/`)
- Métricas de inscripción por evento, empresa, carrera
- Dashboard con gráficas (consumidas por Recharts en el frontend)

### Exports (`/api/v1/exports/`)
- Exportación de datos a CSV/PDF (con `jsPDF` en frontend o generación server-side)

### Sistema (`/api/v1/system/`)
- Métricas de latencia por endpoint, uptime, request count
- Dashboard técnico con buffer de métricas en memoria + flush periódico a DB

---

## 7. Pipeline CI/CD — GitHub Actions

### Flujo completo (`.github/workflows/deploy.yml`)

```
git push → main
    │
    ▼
Job 1: TEST
  - actions/setup-python@v5 (Python 3.12, cache pip)
  - pip install requirements.txt + pytest + pytest-asyncio + httpx + fakeredis + aiosqlite
  - pytest -q (tests con DB en memoria SQLite + Redis simulado)
    │
    ▼ (si pasan los tests)
Job 2: BUILD & PUSH
  - docker/setup-buildx-action (BuildKit habilitado)
  - docker/login-action → ghcr.io con GITHUB_TOKEN
  - docker/metadata-action → tags: sha-<commit> + latest
  - docker/build-push-action → multi-stage build, cache GHA
  - Build arg: VITE_GOOGLE_CLIENT_ID inyectado en tiempo de build
    │
    ▼ (imagen en GHCR)
Job 3: DEPLOY
  - appleboy/ssh-action → SSH al EC2
  - git pull (nginx/scripts viven en el VPS)
  - docker pull imagen:latest desde GHCR
  - docker compose up -d --remove-orphans
  - Health check loop: espera hasta que feria_app esté "healthy" (máx 150 seg)
  - alembic upgrade head dentro del contenedor
  - docker image prune (limpieza de imágenes >7 días)
```

**Concurrency:** `cancel-in-progress: false` — si hay un deploy en curso, el siguiente espera. No hay deploys paralelos a producción.

---

## 8. Infraestructura Docker

### Dockerfile (multi-stage)
1. **Stage build-frontend:** Node.js → `npm ci` + `vite build` → `/frontend/dist`
2. **Stage prod:** Python 3.12-slim → instala dependencias Python → copia código backend + dist del frontend

### docker-compose.prod.yml — 3 servicios
| Servicio | Imagen | Configuración clave |
|---|---|---|
| `feria_app` | GHCR (imagen propia) | `restart: unless-stopped`, healthcheck HTTP, secretos desde `.env.production` + SSM |
| `feria_redis` | `redis:7-alpine` | Password requerido, `appendonly yes`, `maxmemory 256mb`, política `allkeys-lru` |
| `feria_nginx` | `nginx:1.27-alpine` | Ports 80+443, `depends_on: app healthy`, kill-switch de mantenimiento vía flag file |

### Red Docker
- Red bridge `feria_net`: los servicios se comunican por nombre (`redis`, `app`) sin exponer puertos al host innecesariamente.

---

## 9. Frontend — Arquitectura React

### Estructura de páginas
```
/login          → Login.jsx (email+password o Google)
/registro       → Registro.jsx (wizard multi-paso, validación de padrón)
/auth/wizard    → AuthWizard.jsx (onboarding TOTP, perfil de contacto)
/alumno/*       → Dashboard alumno, QR dinámico
/empresa/*      → Escáner QR, lista de inscritos
/admin/*        → Dashboard.jsx + paneles especializados
  ├── AdminOverviewPanel.jsx
  ├── EstadisticasPanel.jsx
  ├── CredencialesPanel.jsx
  └── SystemDashboardPanel.jsx
```

### Patrones de UI
- **ProtectedRoute.jsx** — HOC que verifica JWT antes de renderizar rutas privadas
- **Rutas protegidas por rol** — alumno/empresa/admin tienen dashboards separados
- **Polling automático del QR** — `setInterval` de 28 segundos para refrescar antes de que expire el TOTP
- **Framer Motion** — animaciones de entrada/salida de pantallas del wizard
- **Recharts** — gráficas de barras, líneas y área en el dashboard de estadísticas
- **html5-qrcode** — acceso a cámara del dispositivo para escanear QR (empresa)

### Testing Frontend
- **Vitest** como test runner (compatible con Vite, ESM nativo)
- **@testing-library/react** para tests de componentes
- **jsdom** como entorno DOM simulado

---

## 10. Patrones de Diseño y Prácticas de Ingeniería

| Patrón | Dónde se aplica |
|---|---|
| **Repository / Service Layer** | `services/` separa lógica de negocio de los routers (controladores) |
| **Dependency Injection** | FastAPI `Depends()` para DB session, usuario actual, caché Redis |
| **Secrets Abstraction** | `core/secrets.py` implementa `SecretsProvider` Protocol; soporta `env` y `aws` backends intercambiables |
| **Async I/O** | Toda la DB (asyncpg), Redis y lógica de negocio son `async/await` |
| **Background Tasks** | Envío de correos con `FastAPI.BackgroundTasks` — no bloquea el response del escáner |
| **SPA Fallback** | `SPAStaticFiles` custom sirve `index.html` para cualquier ruta no-asset (client-side routing) |
| **Structured Logging** | `structlog` con contextvars: cada log line incluye `request_id`, nivel, timestamp ISO |
| **Health Check** | `/api/v1/health` — usado por Docker healthcheck y nginx |
| **Metrics Buffer** | `MetricSample` en memoria con flush periódico a DB — evita un INSERT por request |
| **Pagination** | `core/pagination.py` — cursor/offset reutilizable en todos los endpoints de listado |
| **Profanity Filter** | `core/profanity.py` — validación de descripciones personales |
| **Role Switch** | `core/role_switch.py` — admin puede operar como otros roles |

---

## 11. Gestión de Secretos

### En desarrollo
- Archivo `.env` local (en `.gitignore`)
- `python-dotenv` carga vars al proceso

### En producción
- **AWS Systems Manager Parameter Store** bajo prefijo `/feria/prod/`
- `AwsParameterStoreProvider` hace un `get_parameters_by_path` paginado al arranque
- Los parámetros se inyectan en `os.environ` antes de que Pydantic-Settings los lea
- IAM Role del EC2 con política `AmazonSSMReadOnlyAccess` (credenciales mínimas)
- Secrets sensibles: `JWT_SECRET_KEY`, `FERNET_SECRET_KEY`, `GOOGLE_CLIENT_SECRET`, credenciales DB, `REDIS_PASSWORD`, `SENTRY_DSN`

---

## 12. Flujo de Negocio — Resumen para CV

```
1. Admin precarga padrón oficial (matrícula + carrera)
2. Alumno se registra (valida contra padrón) con email/password o Google OAuth
3. Sistema verifica identidad con TOTP (Google Authenticator)
4. Alumno selecciona eventos y completa perfil de contacto
5. Sistema genera QR cifrado con Fernet que se renueva cada 30s
6. Representante de empresa escanea QR con cámara del dispositivo
7. Backend descifra, verifica TOTP, valida cupo y unicidad, inscribe en DB
8. Sistema envía email de confirmación automático (background task)
9. Admin monitorea inscripciones, estadísticas y exporta reportes
```

---

## 13. Métricas y Observabilidad

| Herramienta | Qué mide |
|---|---|
| **Sentry** | Errores no capturados, performance traces (sample rate 20% en prod) |
| **structlog** | Logs estructurados en JSON: cada request, error, acción de auditoría |
| **RequestMetric (custom)** | Latencia p50/p95/p99 por endpoint, almacenada en DB con buffer en memoria |
| **SystemDashboardPanel** | Vista en el frontend de métricas del sistema en tiempo real |
| **Docker healthcheck** | Polling HTTP a `/api/v1/health` cada 30s; el deploy espera estado `healthy` |
| **Log de auditoría** | Tabla dedicada con IP + timestamp de cada login, inscripción, baja |

---

## 14. Puntos de Alto Impacto para el CV

Estos son los aspectos más diferenciadores y técnicamente sólidos del proyecto:

1. **QR dinámico con criptografía real** — Fernet (AES-128-CBC + HMAC-SHA256) + TOTP embebido. El QR es infalsificable y expira cada 30 segundos.

2. **MFA completo desde cero** — Google OAuth 2.0 con validación de id_token, nonce anti-replay, TOTP (RFC 6238), tokens JWT con refresh y revocación.

3. **Pipeline CI/CD completo** — GitHub Actions: tests → Docker multi-stage build → push a GHCR → deploy SSH a EC2 → health check → migración DB. Zero-downtime en ~3 min.

4. **Arquitectura cloud production-grade** — EC2 + Cloudflare + Nginx + Docker Compose + AWS SSM para secretos. No hay credenciales en el código fuente.

5. **Seguridad en profundidad** — 12+ mecanismos: CSP, HSTS, rate limiting, lockout, HttpOnly cookies, CORS, constraint único en DB, log de auditoría, SSH tunnel.

6. **Async end-to-end** — FastAPI + asyncpg + Redis async. Background tasks para emails sin bloquear responses.

7. **Observabilidad producción** — Sentry, structlog JSON, métricas de latencia custom con buffer, request IDs para trazabilidad.
