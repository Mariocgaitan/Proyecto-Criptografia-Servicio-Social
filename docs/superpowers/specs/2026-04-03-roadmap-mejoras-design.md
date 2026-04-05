# Roadmap de Mejoras — SID (Sistema de Inscripcion Dinamica)

**Fecha:** 2026-04-03
**Alcance:** Full roadmap (infraestructura, seguridad, caching, observabilidad, tests, frontend)

---

## Decisiones de diseno

| Tema | Decision | Razon |
|------|----------|-------|
| Recuperar contrasena | Por correo @tec.mx | Ya existe email_service.py con SMTP. Flujo estandar que usuarios esperan |
| Tests backend | pytest + pytest-asyncio | Ya en dev dependencies, estandar para FastAPI |
| Tests frontend | Vitest | Integracion nativa con Vite (ya en uso), rapido |
| Caching | Redis | Agregar a docker-compose, sirve tambien para rate limiting multi-worker |
| Refactor archivos grandes | Excluido | Riesgoso sin tests. Hacerlo despues cuando haya cobertura |
| Logging/Observabilidad | structlog (JSON) + Sentry | Balance esfuerzo/valor sin montar Jaeger/Grafana |

---

## Seccion 1: Backend — Infraestructura y Configuracion

### 1. Endpoint `/health`
- `GET /health` publico (sin auth)
- Valida conexion a DB (query simple) y Redis (PING)
- Retorna `{ "status": "ok"|"degraded"|"down", "version": "x.y.z", "db": true|false, "redis": true|false }`
- Status codes: 200 (ok/degraded), 503 (down)

### 2. Redis
- Agregar servicio `redis:7-alpine` a docker-compose
- Cliente async con `redis.asyncio` en `app/core/redis.py`
- Config en settings: `REDIS_URL` (default `redis://localhost:6379/0`)
- Connection pool con health check
- Graceful shutdown en lifespan

### 3. Fix Dockerfile
- Actualizar imagen base de `python:3.11-slim` a `python:3.12-slim`
- Verificar compatibilidad de dependencias

### 4. Logging estructurado
- Reemplazar todos los `print()` con `structlog`
- Formato JSON en produccion, formato legible (coloreado) en desarrollo
- Campos base en cada log: `timestamp`, `level`, `request_id`, `module`
- Middleware que inyecta `request_id` en contexto de structlog

### 5. Sentry
- `sentry-sdk[fastapi]` en dependencias
- Inicializacion en `main.py` con `dsn` desde settings
- Filtrar datos sensibles: passwords, tokens, cookies
- Environment tag (development/production)
- Sample rate configurable

### 6. Validacion al startup
- En el lifespan de FastAPI, antes de aceptar trafico:
  - Verificar conexion a PostgreSQL (query `SELECT 1`)
  - Verificar conexion a Redis (PING)
  - Verificar que `JWT_SECRET_KEY` >= 32 chars
  - Verificar que `QR_ENCRYPTION_KEY` es Fernet valido
- Si falla alguna validacion critica (DB), no arrancar
- Si falla Redis, arrancar en modo degradado (log warning)

---

## Seccion 2: Backend — Seguridad y Auth

### 7. Recuperacion de contrasena por email
- **Modelo:** `PasswordResetToken` — `token_hash`, `id_matricula`, `expira_en`, `usado`
- **Endpoint `POST /api/v1/auth/forgot-password`:**
  - Recibe `{ "correo": "..." }`
  - Busca usuario por correo normalizado
  - Si existe: genera token aleatorio (32 bytes hex), guarda hash SHA-256 en DB, expira en 15min
  - Envia email con link: `{FRONTEND_URL}/reset-password?token={raw_token}`
  - Siempre retorna 200 con mensaje generico (no revelar si el correo existe)
  - Rate limit: 3/minute
- **Endpoint `POST /api/v1/auth/reset-password`:**
  - Recibe `{ "token": "...", "new_password": "..." }`
  - Valida token (existe, no expirado, no usado)
  - Valida fuerza de contrasena
  - Actualiza password_hash del usuario
  - Marca token como usado
  - Revoca todos los refresh tokens del usuario (forzar re-login)
  - Log de auditoria: `PASSWORD_RESET`
- **Email:** HTML con branding Tec, link de reset, aviso de expiracion

### 8. Validacion de fuerza de contrasena
- Funcion `validate_password_strength(password: str) -> None` en `app/core/security.py`
- Reglas: min 8 chars, 1 mayuscula, 1 minuscula, 1 numero, 1 caracter especial
- Raise `ValueError` con mensaje descriptivo si no cumple
- Aplicar en: registro (`registrar_alumno`), reset password, y cambio de contrasena futuro
- Mismas reglas replicadas en frontend para feedback inmediato

### 9. Nonce en Google OAuth
- Generar nonce aleatorio (UUID4) en backend antes de iniciar flujo
- Almacenar hash en DB/Redis con TTL de 5min
- Enviar nonce al frontend para que lo incluya en el request a Google
- Validar que el `nonce` claim del id_token coincida con el almacenado
- Rechazar si no coincide o si ya fue usado

### 10. Paginacion
- Helper generico: `paginate(query, page, page_size) -> { data, total, page, pages }`
- Parametros: `page` (default 1, min 1), `page_size` (default 20, max 100)
- Aplicar a:
  - `GET /admin/proyectos`
  - `GET /admin/estadisticas/alumnos-por-empresa`
  - `GET /admin/estadisticas/alumnos-por-carrera`
  - Logs de auditoria (si se exponen)
- Mantener endpoints de estadisticas agregadas (KPIs, ocupacion) sin paginar

### 11. Rate limiting con Redis
- Migrar storage de SlowAPI de `MemoryStorage` a `RedisStorage`
- Usar la misma conexion Redis del punto 2
- Fallback a memoria si Redis no esta disponible

---

## Seccion 3: Backend — Caching y Observabilidad

### 12. Cache en Redis
- Wrapper `app/core/cache.py` con funciones `cache_get`, `cache_set`, `cache_delete`
- Serializar con JSON, prefijo de keys: `sid:`
- Datos cacheados:
  - `sid:eventos_activos` — TTL 5min
  - `sid:carreras` — TTL 1h
  - `sid:kpis` — TTL 2min
  - `sid:estadisticas:{tipo}` — TTL 2min
- Invalidacion: al crear/modificar proyecto o inscripcion, borrar keys de estadisticas
- Decorador `@cached(key="...", ttl=300)` para simplificar uso en servicios

### 13. Request ID tracing
- Middleware que:
  - Lee `X-Request-ID` del header entrante (si existe, reutilizar)
  - Si no existe, genera UUID4
  - Lo inyecta en `request.state.request_id`
  - Lo agrega a contexto de structlog
  - Lo incluye en header de respuesta `X-Request-ID`
- Todos los logs de la peticion incluyen el request_id automaticamente

### 14. Logging en routers y servicios
- Reemplazar `print()` restantes en: `main.py`, `ssh_manager.py`, `email_service.py`
- Agregar logs en:
  - Inicio/fin de login, registro, escaneo QR (con duracion)
  - Errores de DB (connection, query failures)
  - Fallos de envio de email
  - Rate limit hits
  - Cache misses en datos criticos
- Niveles: INFO para operaciones normales, WARNING para degradacion, ERROR para fallos

### 15. Metricas de cache
- Contadores en Redis: `sid:cache:hits`, `sid:cache:misses`
- Endpoint `GET /admin/sistema/cache-stats` (solo admin)
- Log periodico de hit/miss ratio (cada 100 requests o cada 5min)

---

## Seccion 4: Backend — Tests

### 16. Setup de pytest
- `conftest.py` raiz con fixtures:
  - `db_session` — AsyncSession con SQLite async en memoria (o testcontainers PostgreSQL)
  - `client` — `httpx.AsyncClient` con app montada
  - `auth_headers(role)` — factory que retorna headers con JWT valido para el rol
  - `redis_mock` — `fakeredis.aioredis` para cache/rate limiting
  - `sample_usuario`, `sample_evento`, `sample_proyecto` — datos de prueba
- `pytest.ini` o seccion en `pyproject.toml` con config de asyncio mode

### 17. Tests de auth
- `test_registro`: exitoso, matricula duplicada, matricula no en padron, nombre no coincide, contrasena debil
- `test_login`: correcto, contrasena incorrecta, usuario no existe, lockout tras N intentos, login con cuenta bloqueada, desbloqueo tras timeout
- `test_refresh`: token valido, token expirado, token revocado
- `test_logout`: revocacion de refresh token
- `test_google_oauth`: token valido, dominio no @tec.mx, nonce invalido
- `test_totp`: codigo correcto, codigo incorrecto, replay detection

### 18. Tests de flujos criticos
- `test_qr`: generacion de payload, validacion/descifrado, payload expirado, payload manipulado
- `test_escaneo`: empresa escanea QR valido, QR de alumno no inscrito, QR expirado
- `test_inscripcion`: inscribir alumno en proyecto, proyecto lleno, desinscribir
- `test_export_csv`: exportacion exitosa, filtrado por rol, formato correcto

### 19. Tests de seguridad
- `test_sin_token`: todos los endpoints protegidos retornan 401
- `test_token_expirado`: retorna 401
- `test_rol_incorrecto`: alumno en endpoint admin retorna 403
- `test_rate_limit`: exceder limite retorna 429 con Retry-After
- `test_inputs`: caracteres especiales en nombre, SQL en correo, XSS en campos de texto

### 20. Tests de recuperacion de contrasena
- `test_forgot_password`: genera token y envia email
- `test_forgot_password_correo_inexistente`: retorna 200 sin revelar info
- `test_reset_password`: token valido, password actualizado
- `test_reset_token_expirado`: retorna error
- `test_reset_token_usado`: retorna error
- `test_reset_password_debil`: rechaza contrasena que no cumple reglas

---

## Seccion 5: Frontend — Funcionalidad Nueva

### 21. Flujo de recuperacion de contrasena
- **Pantalla 1 — Pedir correo:** accesible desde link "Olvidaste tu contrasena?" en login. Input de correo, boton enviar. Misma estetica del AuthWizard.
- **Pantalla 2 — Confirmacion:** "Revisa tu correo @tec.mx. Te enviamos un enlace para restablecer tu contrasena." Boton para volver a login.
- **Pantalla 3 — Reset:** ruta `/reset-password?token=...`. Inputs: nueva contrasena + confirmar. Indicador de fuerza. Validacion en tiempo real. Exito redirige a login con toast "Contrasena actualizada".
- **Errores:** token invalido/expirado muestra mensaje claro con link para solicitar otro.

### 22. Pagina 404
- Ruta catch-all renderiza componente `NotFound`
- Diseno consistente con el app (fondo slate-950, tipografia blanca)
- Mensaje: "Pagina no encontrada"
- Boton "Volver al inicio" que redirige segun estado de auth (login si no autenticado, dashboard si autenticado)

### 23. Manejo de sesion expirada
- Wrapper alrededor de `fetch` en `useAuth` o util separado
- Intercepta respuestas 401
- Primer intento: llama a `/auth/refresh` automaticamente
- Si refresh falla: limpia estado de usuario, redirige a `/login` con query param `?expired=true`
- Login muestra toast: "Tu sesion ha expirado, inicia sesion nuevamente"
- No aplicar retry en los propios endpoints de auth (login, refresh, logout)

### 24. Indicador de fuerza de contrasena
- Componente reutilizable `PasswordStrengthIndicator`
- Barra de progreso con 4 niveles: debil (rojo), regular (naranja), buena (amarillo), fuerte (verde)
- Checklist visual debajo: min 8 chars, mayuscula, minuscula, numero, especial
- Cada regla se marca con check verde cuando se cumple
- Usar en: registro (Registro/AuthWizard) y reset de contrasena

### 25. Mostrar Request ID en errores
- Cuando un fetch retorna 500, leer header `X-Request-ID` de la respuesta
- Mostrar al usuario: "Ocurrio un error inesperado. Si el problema persiste, comparte este codigo con soporte: `[request-id]`"
- El request ID debe ser copiable (click to copy)

---

## Seccion 6: Frontend — Tests

### 26. Setup de Vitest
- Instalar `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`
- Config en `vite.config.js` o `vitest.config.js`
- Setup file: mock global de `fetch`, mock de `useAuth` context, alias `@/` resuelto
- Scripts en package.json: `test`, `test:watch`, `test:coverage`

### 27. Tests de auth
- `Login.test.jsx`: render formulario, submit con credenciales, error en login fallido, redirect tras login exitoso
- `Registro.test.jsx`: validacion de campos, password strength feedback, submit exitoso
- `ForgotPassword.test.jsx`: envio de correo, pantalla de confirmacion
- `ResetPassword.test.jsx`: validacion de password, token invalido, exito
- `sesion_expirada.test.jsx`: 401 triggerea refresh, refresh fallido redirige a login

### 28. Tests de componentes clave
- `ProtectedRoute.test.jsx`: usuario autenticado con rol correcto pasa, sin auth redirige, rol incorrecto redirige
- `NotFound.test.jsx`: renderiza correctamente, boton redirige segun auth state
- `PasswordStrengthIndicator.test.jsx`: cada regla se marca/desmarca correctamente, nivel cambia
- `ErrorDisplay.test.jsx`: muestra request ID, boton de copiar funciona

### 29. Tests de integracion
- Flujo login completo: render login -> input credenciales -> submit -> mock API -> redirect a dashboard
- Flujo empresa: render escaner -> simular scan -> validar resultado
- Flujo admin: render dashboard -> verificar carga de estadisticas

---

## Orden de implementacion sugerido

**Fase 1 — Cimientos (sin dependencias):**
Items 2, 3, 4, 5, 6, 16, 26

**Fase 2 — Seguridad y Auth:**
Items 7, 8, 9, 11, 21, 24

**Fase 3 — Funcionalidad y UX:**
Items 10, 12, 13, 14, 15, 22, 23, 25

**Fase 4 — Tests:**
Items 17, 18, 19, 20, 27, 28, 29
