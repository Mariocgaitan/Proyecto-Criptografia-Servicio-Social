# 02 — Esquema de Base de Datos (PostgreSQL)

## Diagrama de Relaciones (ERD)

```
Usuarios ──────────────────────────────────────────────────────────────┐
│ PK id_matricula (String)                                              │
│    nombre, correo (@tec.mx), carrera, semestre                        │
│    password_hash, totp_secret                                         │
└──────────────────────────────────────────────────────────────────────┘
       │ 1                    │ 1                               │ 1
       │                      │                                │
       ▼ N                    ▼ N (tabla pivote)               ▼ N
Inscripciones          UsuarioEventos                    ListaEspera
│ PK id_inscripcion     │ PK id (Integer)                 │ PK id_espera (UUID)
│ FK id_matricula       │ FK id_matricula                 │ FK id_matricula
│ FK id_proyecto        │ FK id_evento                    │ FK id_proyecto
│    timestamp          │ UNIQUE(id_matricula, id_evento)  │    timestamp_registro
│ UNIQUE(id_matricula,  └──────────────┬──────────────────└──────────────────
│         id_evento)◄─ 1 inscripción   │ N
└──────────────────────── por evento   │
       │ N                             ▼ 1
       │                           Eventos
       ▼ 1                         │ PK id_evento (Integer)
Proyectos ──────────────────────── │    nombre_evento
│ PK id_proyecto (Integer)          │    clave_evento
│ FK id_empresa                     │    fecha_inicio, fecha_fin
│ FK id_evento                      │    activo (Boolean)
│    nombre_proyecto, descripcion   └──────────────────────────────────────
│    capacidad_max, cupo_actual
│    capacidad_espera_max
└──────────────────────────────────────────────────────────────────────┘
       │ N
       ▼ 1
Empresas
│ PK id_empresa (Integer)
│    nombre_empresa
│    logo_url (opcional)
└──────────────────────────────────────────────────────────────────────
```

---

## Definición Detallada de Tablas

### Tabla `Usuarios`
| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id_matricula` | `VARCHAR(10)` | PK | Ej. `'A01234567'` |
| `nombre` | `VARCHAR(100)` | NOT NULL | Nombre completo |
| `correo` | `VARCHAR(150)` | UNIQUE, NOT NULL, INDEX | Debe terminar en `@tec.mx` |
| `carrera` | `VARCHAR(100)` | NOT NULL | Carrera del alumno |
| `semestre` | `INTEGER` | NOT NULL | Semestre actual |
| `password_hash` | `VARCHAR(255)` | NOT NULL | Hash bcrypt |
| `totp_secret` | `VARCHAR(32)` | NOT NULL | Generado con `pyotp.random_base32()` al registrarse. **Nunca se expone en API.** |

> **Nota de Seguridad:** El campo `totp_secret` **nunca** se devuelve en ningún endpoint de la API. El servidor genera el QR completo en el endpoint `/alumno/qr-payload`.
> **Nota:** El campo `periodos` del diseño original fue eliminado. La relación alumno↔evento se gestiona mediante la tabla `UsuarioEventos`.

---

### Tabla `Eventos`
| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id_evento` | `INTEGER` | PK, Autoincrement | |
| `nombre_evento` | `VARCHAR(100)` | NOT NULL | Ej. `"Feria Febrero-Junio 2026"` |
| `clave_evento` | `VARCHAR(20)` | UNIQUE, NOT NULL | Ej. `"FEB_JUN_2026"` |
| `fecha_inicio` | `TIMESTAMP` | NOT NULL | Inicio del evento |
| `fecha_fin` | `TIMESTAMP` | NOT NULL | Fin del evento |
| `activo` | `BOOLEAN` | Default `FALSE` | Solo 1 evento activo a la vez (validado por lógica de negocio) |

> **Regla de Negocio:** El sistema solo permite un evento con `activo = TRUE` a la vez. El admin activa/desactiva eventos desde el panel.

---

### Tabla `UsuarioEventos` *(nueva — tabla pivote)*

Registra a qué eventos se inscribió un alumno durante el **registro previo al evento**. Un alumno puede seleccionar 1 o 2 eventos.

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | `INTEGER` | PK, Autoincrement | |
| `id_matricula` | `VARCHAR(10)` | FK → Usuarios, NOT NULL | |
| `id_evento` | `INTEGER` | FK → Eventos, NOT NULL | |
| `UNIQUE` | — | (`id_matricula`, `id_evento`) | Un alumno no puede seleccionar el mismo evento dos veces |

> **Regla de Negocio:** Al registrarse, el alumno selecciona entre los eventos disponibles (máximo 2). El sistema valida que los eventos seleccionados sean compatibles (no pueden seleccionar dos eventos del mismo período). El dashboard mostrará **un botón de QR por cada evento** que el alumno haya seleccionado.

---

### Tabla `Empresas`
| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id_empresa` | `INTEGER` | PK, Autoincrement | |
| `nombre_empresa` | `VARCHAR(150)` | NOT NULL | Nombre de la empresa |
| `logo_url` | `VARCHAR(255)` | Nullable | URL del logo (opcional) |

---

### Tabla `Proyectos`
| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id_proyecto` | `INTEGER` | PK, Autoincrement | |
| `id_empresa` | `INTEGER` | FK → Empresas, NOT NULL | |
| `id_evento` | `INTEGER` | FK → Eventos, NOT NULL | Evento al que pertenece |
| `nombre_proyecto` | `VARCHAR(200)` | NOT NULL | |
| `descripcion` | `TEXT` | Nullable | Descripción breve del proyecto |
| `capacidad_max` | `INTEGER` | NOT NULL, > 0 | Cupo máximo de inscripciones |
| `cupo_actual` | `INTEGER` | NOT NULL, Default 0 | Contador de inscritos (actualizado transaccionalmente) |
| `capacidad_espera_max` | `INTEGER` | NOT NULL, Default 0 | Cupo máximo de lista de espera (0 = sin lista) |

---

### Tabla `Inscripciones`
| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id_inscripcion` | `UUID` | PK | Generado con `uuid4()` |
| `id_matricula` | `VARCHAR(10)` | FK → Usuarios, NOT NULL | |
| `id_proyecto` | `INTEGER` | FK → Proyectos, NOT NULL | |
| `id_evento` | `INTEGER` | FK → Eventos, NOT NULL | Evento al que corresponde esta inscripción |
| `timestamp` | `TIMESTAMP` | NOT NULL, Default UTC NOW | Momento exacto de la inscripción |
| `UNIQUE` | — | (`id_matricula`, `id_evento`) | **1 sola inscripción confirmada por alumno por evento** |

> **Nota:** El constraint `UNIQUE` compuesto en `(id_matricula, id_evento)` es la segunda línea de defensa. Garantiza que aunque un alumno haya seleccionado 2 eventos, solo pueda quedar inscrito en **1 proyecto por cada evento**. Si la lógica de aplicación falla, la DB rechaza la inserción duplicada.

---

### Tabla `ListaEspera`
| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id_espera` | `UUID` | PK | |
| `id_matricula` | `VARCHAR(10)` | FK → Usuarios, NOT NULL | Un alumno puede estar en lista de espera de varios proyectos |
| `id_proyecto` | `INTEGER` | FK → Proyectos, NOT NULL | |
| `id_evento` | `INTEGER` | FK → Eventos, NOT NULL | Evento al que pertenece este proyecto |
| `timestamp_registro` | `TIMESTAMP` | NOT NULL, Default UTC NOW | Para mantener orden de llegada (FIFO) |
| `UNIQUE` | — | (`id_matricula`, `id_proyecto`) | Un alumno no puede estar dos veces en la espera del mismo proyecto |

> **Regla de Negocio:** Si un alumno en lista de espera escanea su QR (de un evento específico) en otro proyecto con cupo disponible del **mismo evento**, queda **inscrito** en ese proyecto y se **eliminan automáticamente** todas sus entradas en `ListaEspera` **para ese evento**. Sus entradas en lista de espera de otros eventos permanecen intactas.

---

### Tabla `RefreshTokens`
| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | `INTEGER` | PK, Autoincrement | |
| `token_hash` | `VARCHAR(255)` | UNIQUE, NOT NULL | Hash SHA-256 del refresh token |
| `id_matricula` | `VARCHAR(10)` | FK → Usuarios, NOT NULL | |
| `expira_en` | `TIMESTAMP` | NOT NULL | Expiración (8 horas desde emisión) |
| `revocado` | `BOOLEAN` | Default `FALSE` | Se marca `TRUE` al hacer logout |

---

### Tabla `LogsAuditoria`
| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id_log` | `UUID` | PK | |
| `timestamp` | `TIMESTAMP` | NOT NULL, Default UTC NOW | |
| `tipo_evento` | `VARCHAR(50)` | NOT NULL | Ej. `LOGIN_EXITOSO`, `TOTP_INVALIDO`, `INSCRIPCION_OK`, `CUPO_LLENO`, `YA_INSCRITO` |
| `id_matricula` | `VARCHAR(10)` | Nullable | Matrícula involucrada (si aplica) |
| `id_proyecto` | `INTEGER` | Nullable | Proyecto involucrado (si aplica) |
| `ip_origen` | `VARCHAR(45)` | Nullable | IP del cliente |
| `detalle` | `TEXT` | Nullable | Información adicional |

---

## Índices Recomendados

```sql
-- Para búsquedas frecuentes de inscripciones por proyecto
CREATE INDEX idx_inscripciones_proyecto ON Inscripciones(id_proyecto);

-- Para verificar si un alumno ya está inscrito en un evento (consulta muy frecuente)
CREATE INDEX idx_inscripciones_alumno_evento ON Inscripciones(id_matricula, id_evento);

-- Para obtener los eventos de un alumno (dashboard)
CREATE INDEX idx_usuario_eventos_matricula ON UsuarioEventos(id_matricula);

-- Para búsquedas de lista de espera por proyecto (ordenadas por tiempo)
CREATE INDEX idx_espera_proyecto_tiempo ON ListaEspera(id_proyecto, timestamp_registro);

-- Para auditoría por matrícula
CREATE INDEX idx_logs_matricula ON LogsAuditoria(id_matricula);

-- Para refresh tokens no revocados
CREATE INDEX idx_refresh_activos ON RefreshTokens(token_hash) WHERE revocado = FALSE;
```
