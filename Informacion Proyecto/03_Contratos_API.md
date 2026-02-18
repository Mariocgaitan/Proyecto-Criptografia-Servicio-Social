# 03 — Contratos de API (Endpoints)

## Convenciones Generales

- **Base URL:** `https://<dominio>/api/v1`
- **Formato:** JSON en todos los request/response bodies.
- **Autenticación:** Bearer Token (JWT Access Token) en el header `Authorization` para endpoints protegidos.
- **Errores:** Se usan códigos HTTP estándar con body `{"detail": "Mensaje descriptivo"}`.

---

## A. Módulo de Autenticación (`/auth`)

### `POST /api/v1/auth/registro`
Registra un nuevo alumno en el sistema.

**Request Body:**
```json
{
  "nombre": "Juan Pérez García",
  "correo": "A01234567@tec.mx",
  "matricula": "A01234567",
  "carrera": "ITC",
  "semestre": 6,
  "password": "MiContraseñaSegura123",
  "eventos_seleccionados": [2, 3]
}
```

> **Nota:** `eventos_seleccionados` es una lista de `id_evento`. El alumno puede seleccionar **1 o 2 eventos** de los disponibles. El frontend presenta los eventos activos como checkboxes.

**Lógica:**
1. Validar que `correo` termine en `@tec.mx`. (HTTP 400 si no)
2. Validar que `matricula` no exista ya en DB. (HTTP 400 si existe)
3. Validar que `eventos_seleccionados` tenga entre 1 y 2 elementos. (HTTP 400 si no)
4. Validar que los `id_evento` existan en la DB. (HTTP 400 si alguno no existe)
5. Validar que no se seleccionen dos eventos del mismo período (ej. no se puede seleccionar "Verano" y "Verano" dos veces). (HTTP 400 si hay conflicto)
6. Hashear `password` con `bcrypt`.
7. Generar `totp_secret` con `pyotp.random_base32()`.
8. Insertar en tabla `Usuarios`.
9. Insertar registros en tabla `UsuarioEventos` (uno por cada evento seleccionado).

**Responses:**
| Código | Descripción |
|---|---|
| `201 Created` | `{"message": "Registro exitoso", "matricula": "A01234567", "eventos_registrados": 2}` |
| `400 Bad Request` | `{"detail": "El correo debe ser institucional (@tec.mx)"}` |
| `400 Bad Request` | `{"detail": "La matrícula o correo ya están registrados"}` |
| `400 Bad Request` | `{"detail": "Debes seleccionar entre 1 y 2 eventos"}` |
| `400 Bad Request` | `{"detail": "Uno o más eventos seleccionados no existen o no están disponibles"}` |

---

### `POST /api/v1/auth/login`
Autentica a un alumno y emite tokens de sesión.

**Request Body:**
```json
{
  "correo": "A01234567@tec.mx",
  "password": "MiContraseñaSegura123"
}
```

**Lógica:**
1. Buscar usuario por `correo`.
2. Verificar `password` contra `password_hash` con `bcrypt.verify()`.
3. Emitir **Access Token** JWT (expira en 15 min) con payload `{"sub": "A01234567", "rol": "alumno"}`.
4. Emitir **Refresh Token** (string aleatorio seguro), hashear con SHA-256, guardar en tabla `RefreshTokens` (expira en 8 hrs).
5. Devolver Access Token en body; Refresh Token en cookie `HttpOnly, Secure, SameSite=Strict`.

**Responses:**
| Código | Descripción |
|---|---|
| `200 OK` | `{"access_token": "<jwt>", "token_type": "bearer"}` |
| `401 Unauthorized` | `{"detail": "Credenciales inválidas"}` |

---

### `POST /api/v1/auth/refresh`
Renueva el Access Token usando el Refresh Token.

**Request:** Cookie `HttpOnly` con el refresh token (enviada automáticamente por el browser).

**Lógica:**
1. Leer refresh token de la cookie.
2. Hashear y buscar en `RefreshTokens` donde `revocado = FALSE` y `expira_en > NOW()`.
3. Si válido, emitir nuevo Access Token.

**Responses:**
| Código | Descripción |
|---|---|
| `200 OK` | `{"access_token": "<nuevo_jwt>", "token_type": "bearer"}` |
| `401 Unauthorized` | `{"detail": "Sesión expirada, inicia sesión nuevamente"}` |

---

### `POST /api/v1/auth/logout`
Invalida la sesión del usuario.

**Auth:** Bearer Token requerido.

**Lógica:**
1. Leer refresh token de la cookie.
2. Marcar como `revocado = TRUE` en `RefreshTokens`.
3. Eliminar la cookie del cliente.

**Responses:**
| Código | Descripción |
|---|---|
| `200 OK` | `{"message": "Sesión cerrada exitosamente"}` |

---

## B. Módulo Alumno (`/alumno`)

### `GET /alumno/dashboard`
Vista principal del alumno. Protegida por auth.

**Auth:** Bearer Token (rol: `alumno`).

**Lógica (Server-Side Render con Jinja2):**
1. Obtener los eventos seleccionados por el alumno desde `UsuarioEventos`.
2. Por cada evento seleccionado, verificar si el alumno ya tiene inscripción confirmada.
3. Renderizar la vista con **una sección por evento**:
   - Si **ya inscrito en ese evento**: Mostrar nombre del proyecto y empresa. No mostrar QR para ese evento.
   - Si **no inscrito en ese evento**: Mostrar botón **"Generar QR — [Nombre del Evento]"** que activa el QR dinámico para ese `id_evento`.

**Ejemplo visual con 2 eventos seleccionados:**
```
┌─────────────────────────────────────────────────────────┐
│  Hola, Juan Pérez                                        │
│                                                          │
│  EVENTO: Verano 2026                                     │
│  ┌─────────────────────────────────────────────────┐    │
│  │  [QR Dinámico — se actualiza cada 30s]          │    │
│  │  Expira en: 18s                                 │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  EVENTO: Agosto-Diciembre 2026                           │
│  ┌─────────────────────────────────────────────────┐    │
│  │  [QR Dinámico — se actualiza cada 30s]          │    │
│  │  Expira en: 18s                                 │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

---

### `GET /api/v1/alumno/qr-payload`
Genera el payload actual del QR del alumno para un evento específico. **Llamado por JS cada 30 segundos por cada evento activo del alumno.**

**Auth:** Bearer Token (rol: `alumno`).

**Query Parameter:** `?id_evento=2` (requerido)

**Lógica:**
1. Verificar que el alumno tenga el `id_evento` en su tabla `UsuarioEventos`. (HTTP 403 si no)
2. Verificar que el alumno no esté ya inscrito en ese evento. (HTTP 200 con `ya_inscrito: true` si sí)
3. Obtener `totp_secret` del alumno desde DB (nunca sale de aquí).
4. Generar código TOTP actual con `pyotp.TOTP(secret).now()`.
5. Construir y devolver el payload JSON que irá codificado en el QR, incluyendo el `id_evento`.

**Response `200 OK`:**
```json
{
  "qr_data": "{\"matricula\": \"A01234567\", \"totp\": \"482931\", \"id_evento\": 2}",
  "expira_en_segundos": 18,
  "ya_inscrito": false
}
```

> **Seguridad:** El `totp_secret` **nunca** sale del servidor. El cliente solo recibe el payload ya construido para renderizar el QR con `qrcode.js`.
> **Nota:** El `id_evento` se incluye en el payload del QR para que la empresa sepa a qué evento corresponde el escaneo, y el backend pueda validar que el proyecto escaneado pertenece al mismo evento.

---

### `GET /api/v1/alumno/estado-inscripcion`
Consulta el estado de inscripción del alumno en **todos sus eventos seleccionados**.

**Auth:** Bearer Token (rol: `alumno`).

**Response `200 OK`:**
```json
{
  "eventos": [
    {
      "id_evento": 2,
      "nombre_evento": "Verano 2026",
      "inscrito": true,
      "proyecto": {
        "nombre": "Desarrollo de App Móvil",
        "empresa": "CEMEX",
        "descripcion": "..."
      },
      "timestamp": "2026-02-18T14:30:00Z"
    },
    {
      "id_evento": 3,
      "nombre_evento": "Agosto-Diciembre 2026",
      "inscrito": false,
      "en_lista_espera": [
        {"id_proyecto": 12, "nombre_proyecto": "IA para Logística", "posicion": 3}
      ]
    }
  ]
}
```

---

## C. Módulo Empresa (`/empresa`)

### `GET /empresa/escaner/{id_proyecto}`
Vista web del escáner QR para la empresa. Protegida (acceso por link con token de empresa o login de empresa).

**Lógica (Frontend):**
1. Activar cámara con `html5-qrcode`.
2. Al leer un QR, extraer el JSON `{"matricula": "...", "totp": "..."}`.
3. Disparar `POST /api/v1/inscripciones/validar` con los datos + `id_proyecto` de la URL.
4. Mostrar resultado visualmente (✅ Inscrito / ❌ Error con mensaje).

---

### `POST /api/v1/inscripciones/validar`
**Endpoint transaccional crítico.** Valida el QR e inscribe al alumno.

**Request Body:**
```json
{
  "matricula": "A01234567",
  "totp_leido": "482931",
  "id_proyecto": 7
}
```

**Lógica Transaccional Estricta:**
```
1. Verificar TOTP:
   - Obtener totp_secret del alumno desde DB.
   - pyotp.TOTP(secret).verify(totp_leido, valid_window=1)
   - Si inválido → HTTP 400 "Código QR expirado o inválido"

2. Obtener el id_evento del proyecto escaneado:
   - SELECT id_evento FROM Proyectos WHERE id_proyecto = ?
   - Verificar que el alumno tenga ese id_evento en UsuarioEventos.
   - Si no → HTTP 403 "El alumno no está registrado para este evento"

3. Verificar que el alumno no esté ya inscrito en ESE evento:
   - SELECT * FROM Inscripciones WHERE id_matricula = ? AND id_evento = ?
   - Si ya inscrito → HTTP 403 "El alumno ya está inscrito en un proyecto de este evento"

4. BEGIN TRANSACTION:
   a. SELECT * FROM Proyectos WHERE id_proyecto = ? FOR UPDATE
      (Bloqueo de fila para evitar race conditions)
   b. IF cupo_actual >= capacidad_max:
      - Verificar si hay cupo en lista de espera
      - Si hay cupo espera → Insertar en ListaEspera → HTTP 202 "Agregado a lista de espera"
      - Si no hay cupo espera → HTTP 409 "Proyecto lleno y sin lista de espera disponible"
   c. INSERT INTO Inscripciones (id_matricula, id_proyecto, id_evento, timestamp)
      - Si falla por UNIQUE(id_matricula, id_evento) → HTTP 403 "El alumno ya está inscrito en este evento"
   d. UPDATE Proyectos SET cupo_actual = cupo_actual + 1
   e. DELETE FROM ListaEspera WHERE id_matricula = ? AND id_evento = ?
      (Eliminar de TODAS las listas de espera de ESE evento solamente)
   f. COMMIT

5. Registrar en LogsAuditoria (tipo: INSCRIPCION_OK)
6. HTTP 200 OK
```

**Responses:**
| Código | Descripción |
|---|---|
| `200 OK` | `{"message": "Inscripción exitosa", "alumno": "Juan Pérez", "proyecto": "App Móvil", "evento": "Verano 2026"}` |
| `202 Accepted` | `{"message": "Proyecto lleno. Alumno agregado a lista de espera", "posicion": 4}` |
| `400 Bad Request` | `{"detail": "Código QR expirado o inválido"}` |
| `403 Forbidden` | `{"detail": "El alumno no está registrado para este evento"}` |
| `403 Forbidden` | `{"detail": "El alumno ya está inscrito en un proyecto de este evento"}` |
| `409 Conflict` | `{"detail": "Proyecto lleno y sin lista de espera disponible"}` |

---

## D. Módulo Admin (`/admin`)

### `POST /api/v1/admin/eventos`
Crear un nuevo evento.

**Auth:** Bearer Token (rol: `admin`).

**Request Body:**
```json
{
  "nombre_evento": "Feria Febrero-Junio 2026",
  "clave_evento": "FEB_JUN_2026",
  "fecha_inicio": "2026-05-10T08:00:00Z",
  "fecha_fin": "2026-05-10T18:00:00Z"
}
```

---

### `POST /api/v1/admin/empresas`
Registrar una empresa en el sistema.

**Auth:** Bearer Token (rol: `admin`).

---

### `POST /api/v1/admin/proyectos`
Registrar un proyecto asociado a una empresa y un evento.

**Auth:** Bearer Token (rol: `admin`).

---

### `GET /api/v1/admin/dashboard/stats`
Estadísticas en tiempo real del evento activo.

**Auth:** Bearer Token (rol: `admin`).

**Response `200 OK`:**
```json
{
  "evento": "Feria Febrero-Junio 2026",
  "total_inscripciones": 342,
  "total_alumnos_registrados": 1000,
  "proyectos": [
    {
      "id_proyecto": 1,
      "nombre": "App Móvil",
      "empresa": "CEMEX",
      "cupo_actual": 15,
      "capacidad_max": 20,
      "en_lista_espera": 3,
      "porcentaje_llenado": 75.0
    }
  ]
}
```

---

### `PATCH /api/v1/admin/proyectos/{id_proyecto}/capacidad`
Permite al admin (o empresa autorizada) ampliar el cupo de un proyecto al final del evento.

**Auth:** Bearer Token (rol: `admin`).

**Request Body:**
```json
{
  "nueva_capacidad_max": 25
}
```

**Lógica:** Si `nueva_capacidad_max > cupo_actual`, el sistema puede automáticamente mover alumnos de la lista de espera a inscripciones (FIFO).
