# 06 — Módulo Admin y Dashboard en Tiempo Real

## 1. Descripción del Módulo

El módulo de administración es el panel de control del coordinador del evento. Permite:

1. **Gestión de Catálogos**: Crear y administrar eventos, empresas y proyectos antes del evento.
2. **Dashboard en Tiempo Real**: Monitorear el comportamiento del evento en vivo (inscripciones, cupos, alertas).
3. **Gestión de Emergencias**: Ampliar cupos de proyectos durante o al final del evento.

---

## 2. Acceso y Autenticación

- El administrador usa el mismo endpoint de login (`POST /api/v1/auth/login`) con credenciales de admin.
- El JWT emitido contiene `{"sub": "admin_id", "rol": "admin"}`.
- Todos los endpoints `/admin/*` verifican que el rol del token sea `admin`. Cualquier otro rol recibe `HTTP 403 Forbidden`.

---

## 3. Gestión de Eventos

### Crear Evento
**`POST /api/v1/admin/eventos`**

```json
{
  "nombre_evento": "Feria Febrero-Junio 2026",
  "clave_evento": "FEB_JUN_2026",
  "fecha_inicio": "2026-05-10T08:00:00Z",
  "fecha_fin": "2026-05-10T18:00:00Z"
}
```

### Activar/Desactivar Evento
**`PATCH /api/v1/admin/eventos/{id_evento}/activar`**

> **Regla de Negocio:** Solo puede haber **un evento activo** a la vez. Al activar un evento, el sistema desactiva automáticamente cualquier otro evento que esté activo.

### Listar Eventos
**`GET /api/v1/admin/eventos`**

```json
[
  {
    "id_evento": 1,
    "nombre_evento": "Feria Febrero-Junio 2026",
    "clave_evento": "FEB_JUN_2026",
    "fecha_inicio": "2026-05-10T08:00:00Z",
    "fecha_fin": "2026-05-10T18:00:00Z",
    "activo": true,
    "total_proyectos": 60,
    "total_inscripciones": 342
  }
]
```

---

## 4. Gestión de Empresas

### Registrar Empresa
**`POST /api/v1/admin/empresas`**

```json
{
  "nombre_empresa": "CEMEX",
  "logo_url": "https://..."  // Opcional
}
```

### Listar Empresas
**`GET /api/v1/admin/empresas`**

### Editar Empresa
**`PUT /api/v1/admin/empresas/{id_empresa}`**

---

## 5. Gestión de Proyectos

### Registrar Proyecto
**`POST /api/v1/admin/proyectos`**

```json
{
  "id_empresa": 3,
  "id_evento": 1,
  "nombre_proyecto": "Desarrollo de App Móvil para Logística",
  "descripcion": "Proyecto de desarrollo de aplicación móvil...",
  "capacidad_max": 20,
  "capacidad_espera_max": 5
}
```

### Ampliar Cupo (Durante/Después del Evento)
**`PATCH /api/v1/admin/proyectos/{id_proyecto}/capacidad`**

```json
{
  "nueva_capacidad_max": 25
}
```

**Lógica de Ampliación:**
1. Verificar que `nueva_capacidad_max > capacidad_max` actual.
2. Calcular cuántos cupos nuevos hay: `nuevos_cupos = nueva_capacidad_max - cupo_actual`.
3. Obtener alumnos en lista de espera ordenados por `timestamp_registro` (FIFO).
4. Mover hasta `nuevos_cupos` alumnos de `ListaEspera` a `Inscripciones`.
5. Actualizar `cupo_actual` y `capacidad_max` en `Proyectos`.

---

## 6. Dashboard en Tiempo Real

### Endpoint de Estadísticas
**`GET /api/v1/admin/dashboard/stats`**

El frontend hace polling a este endpoint cada **5 segundos** para actualizar las gráficas.

**Response completo:**
```json
{
  "evento": {
    "id_evento": 1,
    "nombre": "Feria Febrero-Junio 2026",
    "activo": true,
    "fecha_inicio": "2026-05-10T08:00:00Z"
  },
  "resumen": {
    "total_alumnos_registrados": 1000,
    "total_inscripciones": 342,
    "total_en_lista_espera": 47,
    "porcentaje_participacion": 34.2,
    "proyectos_llenos": 8,
    "proyectos_con_cupo": 52
  },
  "proyectos": [
    {
      "id_proyecto": 1,
      "nombre_proyecto": "App Móvil para Logística",
      "empresa": "CEMEX",
      "cupo_actual": 20,
      "capacidad_max": 20,
      "en_lista_espera": 3,
      "porcentaje_llenado": 100.0,
      "estado": "LLENO"
    },
    {
      "id_proyecto": 2,
      "nombre_proyecto": "IA para Manufactura",
      "empresa": "VITRO",
      "cupo_actual": 14,
      "capacidad_max": 20,
      "en_lista_espera": 0,
      "porcentaje_llenado": 70.0,
      "estado": "DISPONIBLE"
    }
  ],
  "timeline_inscripciones": [
    {"hora": "08:00", "inscripciones_acumuladas": 0},
    {"hora": "08:30", "inscripciones_acumuladas": 45},
    {"hora": "09:00", "inscripciones_acumuladas": 132}
  ]
}
```

---

## 7. Componentes del Dashboard (Frontend)

### 7.1 Tarjetas de Resumen (KPIs)

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  342 / 1000     │  │   8 / 60        │  │      47         │  │    34.2%        │
│  Inscripciones  │  │  Proyectos      │  │  En Lista       │  │  Participación  │
│  Confirmadas    │  │  Llenos         │  │  de Espera      │  │  del Evento     │
└─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘
```

### 7.2 Tabla de Proyectos en Vivo

Tabla ordenable con:
- Nombre del proyecto y empresa
- Barra de progreso visual del cupo (verde → amarillo → rojo)
- Número en lista de espera
- Estado: `DISPONIBLE` / `CASI LLENO` (>80%) / `LLENO`

### 7.3 Gráfica de Timeline

Gráfica de línea que muestra la acumulación de inscripciones a lo largo del tiempo del evento.

### 7.4 Alertas en Tiempo Real

El dashboard muestra alertas cuando:
- Un proyecto se llena (estado cambia a `LLENO`)
- El 80% de los alumnos ya están inscritos
- Hay más de 10 alumnos en lista de espera de un proyecto

---

## 8. Estructura de Archivos del Módulo Admin

```
app/
├── routers/
│   └── admin.py          # Endpoints del módulo admin
├── templates/
│   └── admin/
│       ├── login.html
│       ├── dashboard.html
│       ├── eventos.html
│       ├── empresas.html
│       └── proyectos.html
└── services/
    └── admin_service.py  # Lógica de negocio del admin
```

---

## 9. Consideraciones de Escalabilidad

Con **~1000 alumnos** y **~60 proyectos**, el sistema es relativamente pequeño. Sin embargo, durante el evento puede haber picos de carga (todos intentando inscribirse al mismo tiempo al inicio).

**Estrategias implementadas:**
- **Bloqueos a nivel de fila** (`FOR UPDATE`) en lugar de bloqueos de tabla completa.
- **Índices en columnas de búsqueda frecuente** (ver `02_Esquema_Base_de_Datos.md`).
- **Async/Await** en toda la capa de FastAPI + SQLAlchemy async para no bloquear el event loop.
- **Polling del dashboard cada 5 segundos** (no WebSockets) para simplificar la implementación manteniendo la "sensación" de tiempo real.
