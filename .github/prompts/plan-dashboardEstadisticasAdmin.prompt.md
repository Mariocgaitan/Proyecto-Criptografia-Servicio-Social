# Plan de Dashboard de Estadisticas Admin

Este documento describe una propuesta de tablero admin alineada al backend actual, enfocada en conversion y ocupacion.

## Objetivos

- Monitorear conversion de registrados a inscritos.
- Detectar proyectos con ocupacion baja o alta.
- Analizar tendencia temporal de inscripciones.
- Comparar desempeno contra eventos anteriores.

## Endpoints fuente

- GET /api/v1/admin/estadisticas/kpis
- GET /api/v1/admin/estadisticas/general
- GET /api/v1/admin/estadisticas/particular
- GET /api/v1/admin/estadisticas/ocupacion-eventos
- GET /api/v1/admin/estadisticas/proyectos-cupo
- GET /api/v1/admin/estadisticas/inscripciones-timeline
- GET /api/v1/admin/estadisticas/ratio-inscritos
- GET /api/v1/admin/estadisticas/embudo-conversion
- GET /api/v1/admin/estadisticas/alertas-proyectos
- GET /api/v1/admin/estadisticas/comparativa-eventos
- GET /api/v1/admin/estadisticas/reinscripcion-scatter
- GET /api/v1/admin/estadisticas/logs-recientes

## Componentes sugeridos

1. KPIs globales: registrados, inscritos, ocupacion, empresas.
2. Embudo de conversion por evento y segmento.
3. Ocupacion por evento y por proyecto.
4. Alertas de proyectos por umbrales de ocupacion.
5. Timeline de inscripciones (nuevas y acumuladas).
6. Comparativa de eventos con deltas.
7. Scatter de reinscripcion.

## Criterios de aceptacion

- Todo grafico debe consumir endpoints existentes.
- Los filtros deben ser consistentes entre vistas General y Particular.
- No mezclar universos sin etiquetado explicito (evento vs proyecto).
