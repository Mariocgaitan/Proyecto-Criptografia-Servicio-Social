# Plan: Dashboard Estadísticas Admin con Recharts

## TL;DR
Crear un **dashboard de estadísticas para Admin** (visión estratégica del sistema) con gráficas usando **recharts** en frontend y **nuevos endpoints FastAPI** en backend para cada métrica. El dashboard incluirá 8 gráficas principales, KPIs de resumen, filtros por evento/fecha/empresa/carrera, tooltips explicativos y exportación a CSV/PDF.

---

## 📊 Gráficas Planificadas (8 Total)

### **Tier 1: Ocupación & Capacidad**
1. **Ocupación por Evento** (Barras)
   - X: Eventos disponibles
   - Y: % ocupación (inscritos / capacidad total)
   - Tooltip: Detalle de inscritos vs capacidad
   - Endpoint: `GET /api/v1/admin/estadisticas/ocupacion-eventos`

2. **Proyectos: Cupo vs Inscritos** (Barras agrupadas)
   - Eventos activos → sus proyectos
   - Dos barras: capacidad total vs cupo actual
   - Tooltip: Muestre lista de espera si existe
   - Endpoint: `GET /api/v1/admin/estadisticas/proyectos-cupo`

### **Tier 2: Distribución & Demanda**
3. **Distribución de Alumnos por Empresa** (Pie/Donut)
   - Empresas del evento activo vs total inscrito
   - Click en slice → explota detalles
   - Endpoint: `GET /api/v1/admin/estadisticas/alumnos-por-empresa`

4. **Alumnos por Carrera** (Barras horizontales)
   - Carrera → cantidad inscritos
   - Tooltip: Semestres dentro de carrera
   - Endpoint: `GET /api/v1/admin/estadisticas/alumnos-por-carrera`

5. **Listas de Espera vs Inscritos** (Área acumulativa)
   - Eje X: Tiempo (13 últimos días)
   - Y1: Inscritos, Y2: En espera
   - Muestre tendencia de demanda vs capacidad
   - Endpoint: `GET /api/v1/admin/estadisticas/tendencia-espera`

### **Tier 3: Tendencias & Comportamiento**
6. **Inscripciones en Tiempo Real** (Línea)
   - Últimas 48h, granularidad: cada 2 horas
   - Muestre picos de inscripción
   - Tooltip: Timestamp + cantidad
   - Endpoint: `GET /api/v1/admin/estadisticas/inscripciones-timeline`

7. **Re-inscripción de Alumnos** (Scatter)
   - X: Número de eventos en los que se registró
   - Y: Número de proyectos donde se inscribió
   - Bubble size: Cantidad de alumnos con ese patrón
   - Identifica alumnos comprometidos vs pasivos
   - Endpoint: `GET /api/v1/admin/estadisticas/reinscripcion-scatter`

### **Tier 4: Análisis Comparativo**
8. **Comparativa Multi-dimensional** (Radar)
   - Evento actual vs evento anterior (si existe)
   - Ejes: ocupación, alumnos registrados, proyectos, espera promedio, tasa de confirmación QR
   - Endpoint: `GET /api/v1/admin/estadisticas/comparativa-eventos`

---

## 🎯 KPIs / Tarjetas de Resumen (Header del Dashboard)

Mostrar 6 tarjetas grandes en grid horizontal:
1. **Total Alumnos Registrados** (evento actual)
2. **Total Inscritos** (evento actual)
3. **Ocupación Promedio** (todos los proyectos actual)
4. **En Listas de Espera** (total)
5. **Empresas Participantes** (evento actual)
6. **Tasa de Confirmación QR** (inscritos escaneados / inscritos totales)

---

## 🔧 Endpoints Nuevos Backend

**Base:** `GET /api/v1/admin/estadisticas/{endpoint}`

| Endpoint | Query Params | Response |
|----------|--------------|----------|
| `/ocupacion-eventos` | `evento_id?` | `[{id_evento, nombre, inscritos, capacidad, porcentaje}, ...]` |
| `/proyectos-cupo` | `evento_id?` | `[{id_proyecto, nombre, empresa, capacidad_max, cupo_actual, espera_count}, ...]` | 
| `/alumnos-por-empresa` | `evento_id?` | `[{id_empresa, nombre, cantidad_inscritos}, ...]` |
| `/alumnos-por-carrera` | `evento_id?` | `[{carrera, cantidad, por_semestre}, ...]` |
| `/tendencia-espera` | `evento_id?, dias=13` | `[{fecha, inscritos_acum, espera_acum}, ...]` |
| `/inscripciones-timeline` | `horas=48` | `[{timestamp, cantidad_nueva, acumulado}, ...]` |
| `/reinscripcion-scatter` | `evento_id?` | `[{eventos_registrado, proyectos_inscrito, cantidad_alumnos}, ...]` |
| `/comparativa-eventos` | `evento_actual_id, evento_anterior_id` | `{evento_actual: {...}, evento_anterior: {...}, deltas: {...}}` |

Parámetros comunes:
- `evento_id?` → filtro de evento (default: evento activo)
- Respuestas paginadas opcional para datos grandes

---

## 💾 Frontend: Estructura Componentes React/Vite

**Ubicación base:** `frontend/src/pages/admin/Estadisticas.jsx`

### Componentes a crear:
```
Estadisticas.jsx (Page raíz)
├── FilterBar.jsx
│   ├── Desplegable evento
│   ├── Date picker (rango de fechas)
│   ├── Selector empresa (multi)
│   ├── Selector carrera (multi)
│   └── Botón "Exportar CSV/PDF"
│
├── KPIGrid.jsx
│   ├── KPICard.jsx (componente reutilizable)
│   └── Mostrar 6 tarjetas
│
├── ChartGrid.jsx (Grid 2x4 o 2x2x2x2)
│   ├── OcupacionEventosChart.jsx (Barras)
│   ├── ProyectosQupoChart.jsx (Barras agrupadas)
│   ├── AlumnosPorEmpresaChart.jsx (Pie/Donut)
│   ├── AlumnosPorCarreraChart.jsx (Barras horizontales)
│   ├── TendenciaEsperaChart.jsx (Área)
│   ├── InscripcionesTimelineChart.jsx (Línea)
│   ├── ReinscripcionScatterChart.jsx (Scatter)
│   └── ComparativaRadarChart.jsx (Radar)
│
├── ExportHandler.jsx (manejo CSV/PDF)
└── LoadingState.jsx (skeleton mientras carga)
```

### Colores & Estilos:
- Usar paleta del sistema (tailwind.config.js)
- Recharts con temas personalizados (responsive)
- Grid responsivo: desktop 2 columnas, tablet 1, mobile stack vertical
- Tooltip con estilos coordenados

---

## 📈 Arquitectura Backend

**Archivo principal:** `backend/app/routers/estadisticas.py` (nuevo)

Estructura:
```python
# estadisticas.py
├── @router.get("/ocupacion-eventos")
├── @router.get("/proyectos-cupo")
├── @router.get("/alumnos-por-empresa")
├── @router.get("/alumnos-por-carrera")
├── @router.get("/tendencia-espera")
├── @router.get("/inscripciones-timeline")
├── @router.get("/reinscripcion-scatter")
├── @router.get("/comparativa-eventos")
└── @router.get("/kpis") (agregadas en helper)
```

**Servicio:** `backend/app/services/estadisticas_service.py` (nuevo)

Lógica de negocio:
```python
├── get_ocupacion_eventos(evento_id)
├── get_proyectos_cupo(evento_id)
├── get_alumnos_por_empresa(evento_id)
├── get_alumnos_por_carrera(evento_id)
├── get_tendencia_espera(evento_id, dias)
├── get_inscripciones_timeline(horas)
├── get_reinscripcion_scatter(evento_id)
├── get_comparativa_eventos(evento_actual_id, evento_anterior_id)
└── (usar SQLAlchemy ORM queries, optimizar con `.all()`)
```

---

## 🔐 Seguridad & Filtros

- **Autenticación:** Todos los endpoints requieren `@require_admin` 
- **Validación:** evento_id debe existir, es del usuario admin si aplica
- **Rate limit:** Endpoints estadísticas con límite generoso (100 req/min por IP)
- **CORS:** Admin panel puede ser mismo origen o whitelist específico

---

## 📋 Plan de Implementación (Fases)

### **Fase 1: Configuración Base** (30 min)
1. Crear archivo `backend/app/routers/estadisticas.py` con importes
2. Crear archivo `backend/app/services/estadisticas_service.py` skeleton
3. Registrar router en `backend/app/main.py`
4. Crear página `frontend/src/pages/admin/Estadisticas.jsx` skeleton
5. Agregar ruta en router frontend (ProtectedRoute para admin)

### **Fase 2: Backend - Endpoints & Queries** (90 min)
1. Implementar `get_ocupacion_eventos()` - join usuarios/proyectos/eventos
2. Implementar `get_proyectos_cupo()` - proyectos con joins
3. Implementar `get_alumnos_por_empresa()` - group by empresa_id
4. Implementar `get_alumnos_por_carrera()` - group by carrera + semestre
5. Implementar `get_tendencia_espera()` - time-series last 13 days
6. Implementar `get_inscripciones_timeline()` - time-series last 48h
7. Implementar `get_reinscripcion_scatter()` - group by alumno, count
8. Implementar `get_comparativa_eventos()` - múltiples queries con deltas
9. Helper para KPIs (rápidas, cached si necesario)

### **Fase 3: Frontend - Componentes** (90 min)
1. FilterBar.jsx con event selector, date range, multi-select empresa/carrera
2. KPIGrid.jsx + 6 KPICard componentes
3. OcupacionEventosChart.jsx (BarChart recharts)
4. ProyectosQupoChart.jsx (BarChart recharts, grouped)
5. AlumnosPorEmpresaChart.jsx (PieChart recharts)
6. AlumnosPorCarreraChart.jsx (BarChart horizontal)
7. TendenciaEsperaChart.jsx (AreaChart recharts, dual axis)
8. InscripcionesTimelineChart.jsx (LineChart recharts)
9. ReinscripcionScatterChart.jsx (ScatterChart recharts)
10. ComparativaRadarChart.jsx (RadarChart recharts)
11. ExportHandler.jsx - CSV/PDF (usar librería: papaparse para CSV, jspdf/html2pdf para PDF)

### **Fase 4: Integración & Pulido** (60 min)
1. Conectar FilterBar con API (pasar params a todos endpoints)
2. Loading states (skeletons mientras cargan datos)
3. Error handling (toast/alert si falla endpoint)
4. Responsive design (tailwind grid media queries)
5. Tooltips recharts personalizados
6. Testing manual en admin panel
7. Optimizar queries (indexes si es necesario en DB)

---

## ✅ Verificación

### Backend:
1. `curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/v1/admin/estadisticas/ocupacion-eventos` → devuelve JSON válido
2. Filtro por evento_id funciona y devuelve subset
3. Queries ejecutan en <2 segundos (Performance: comprobar EXPLAIN PLAN)
4. Rate limiting activo (enviar >100 requests rápido → debe rechazar)

### Frontend:
1. Página carga sin errores (Console clean)
2. Gráficas renderizan datos del API correctamente
3. Filtros aplican en tiempo real (sin refrescar manualmente)
4. Exportar CSV/PDF genera archivos descargables
5. Responsive en mobile/tablet (viewport emulation)
6. Tooltips aparecen al hover en gráficas

### Integración:
1. Solo admin puede acceder (`/admin/estadisticas` bloqueada para otros roles)
2. Datos sensibles no se filtran (empresas, alumnos privados)

---

## 📁 Archivos a Crear/Modificar

**CREATE:**
- `backend/app/routers/estadisticas.py` (250 líneas)
- `backend/app/services/estadisticas_service.py` (400 líneas, queries de BD)
- `frontend/src/pages/admin/Estadisticas.jsx` (150 líneas, structure)
- `frontend/src/pages/admin/components/FilterBar.jsx` (80 líneas)
- `frontend/src/pages/admin/components/KPIGrid.jsx` (50 líneas)
- `frontend/src/pages/admin/components/KPICard.jsx` (30 líneas)
- `frontend/src/pages/admin/components/ChartGrid.jsx` (30 líneas)
- `frontend/src/pages/admin/components/OcupacionEventosChart.jsx` (50 líneas)
- `frontend/src/pages/admin/components/ProyectosQupoChart.jsx` (60 líneas)
- `frontend/src/pages/admin/components/AlumnosPorEmpresaChart.jsx` (45 líneas)
- `frontend/src/pages/admin/components/AlumnosPorCarreraChart.jsx` (50 líneas)
- `frontend/src/pages/admin/components/TendenciaEsperaChart.jsx` (60 líneas)
- `frontend/src/pages/admin/components/InscripcionesTimelineChart.jsx` (55 líneas)
- `frontend/src/pages/admin/components/ReinscripcionScatterChart.jsx` (50 líneas)
- `frontend/src/pages/admin/components/ComparativaRadarChart.jsx` (65 líneas)
- `frontend/src/pages/admin/components/ExportHandler.jsx` (80 líneas)

**MODIFY:**
- `backend/app/main.py` (agregar import + `app.include_router(router_estadisticas)`)
- `backend/app/db/models_import.py` (verificar imports de modelos)
- `frontend/src/pages/admin/index.jsx` o router (agregar ruta `/admin/estadisticas`)
- `frontend/package.json` (agregar deps: `papaparse`, `jspdf`, `html2pdf` si no están)

---

## 🔄 Dependencias de Paso

- **Paso 1 (Config)** → bloqueante para **Pasos 2 & 3**
- **Paso 2 (Backend)** → bloqueante para **Paso 4 (Integración)**
- **Paso 3 (Frontend)** → bloqueante para **Paso 4**
- **Paso 4** → verificación independiente de backend + frontend

Recomendación: **Hacer Pasos 1, 2 y 3 en paralelo sin bloqueos**, luego integración.

---

## 🎯 Decisiones Clave

1. **Scope Admin-only:** Más simple a corto plazo; empresas y alumnos después
2. **Nuevos endpoints:** Mejor mantenibilidad que procesar en frontend; backend agrega lógica centralizada
3. **Recharts:** Ligera, muy responsive, perfecta para dashboards
4. **CSV/PDF:** Papaparse (CSV) + html2pdf (PDF simple) para no agregar librerías pesadas
5. **Time-series:** 13 días para espera, 48h para inscripciones (balance de datos vs UI)
6. **Caché opcional:** Si KPIs se actualizan mucho, considerar Redis más adelante

---

## 📚 Referencias en Codebase

**Backend modelos:**
- `backend/app/models/usuario.py` → Usuario (matricula, carrera, semestre, rol)
- `backend/app/models/evento.py` → Evento (id_evento, nombre, periodo, anio, activo)
- `backend/app/models/proyecto.py` → Proyecto (id_proyecto, id_empresa, capacidad_max, cupo_actual)
- `backend/app/models/inscripcion.py` → Inscripcion (id_matricula, id_proyecto, id_evento, timestamp)
- `backend/app/models/lista_espera.py` → ListaEspera (id_matricula, id_proyecto, id_evento)

**Backend endpoints existentes:**
- `backend/app/routers/admin.py` → Usa require_admin decorator, patrón de queries

**Frontend libs:**
- `frontend/package.json` → Recharts ya instalado?, tailwind para estilos
- `frontend/src/lib/api.js` → Función fetchAPI para llamadas (reutilizar patrón)
