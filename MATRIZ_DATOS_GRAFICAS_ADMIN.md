# Matriz de Datos Disponibles -> Graficas Significativas (Admin)

Fecha: 19-03-2026

Objetivo: mapear cada dato disponible del backend de estadisticas a visualizaciones utiles para toma de decisiones de administracion sobre inscripciones.

## 1) Resumen Ejecutivo

- Hay datos suficientes para construir un panel de decisiones en dos vistas: General y Particular.
- Los datos mas accionables hoy son: embudo de conversion, alertas de proyectos, cupo por proyecto y timeline de inscripciones.
- Los datos de diagnostico comparativo son: comparativa de eventos, ratio por proyecto y scatter de reinscripcion.

## 2) Matriz Principal

| Dataset | Endpoint | Nivel | Filtros | Campos clave | Tipo de dato | Grafica recomendada | Pregunta que responde | Prioridad |
|---|---|---|---|---|---|---|---|---|
| KPIs globales | /api/v1/admin/estadisticas/kpis | Evento | evento_id, fecha_inicio, fecha_fin | total_alumnos_registrados, total_inscritos, ocupacion_promedio, empresas_participantes | Metricas agregadas | Tarjetas KPI con umbrales | Como va el sistema hoy en volumen y ocupacion | Alta |
| Contrato General | /api/v1/admin/estadisticas/general | Evento + series | evento_id, carrera, fecha_inicio, fecha_fin, timeline_ventana | kpis, ocupacion_eventos, alumnos_por_carrera, inscripciones_timeline | Mixto | Vista compuesta (KPI + barras + linea) | Cual es la salud general del evento | Alta |
| Contrato Particular | /api/v1/admin/estadisticas/particular | Empresa/proyecto | evento_id, empresa_id, proyecto_id, carrera, fecha_inicio, fecha_fin, timeline_ventana | resumen, proyectos_cupo, alumnos_por_empresa, ratio_inscritos, inscripciones_timeline | Mixto | Vista operativa por segmento | Que proyecto/empresa requiere intervencion | Alta |
| Ocupacion por eventos | /api/v1/admin/estadisticas/ocupacion-eventos | Evento | evento_id | capacidad, inscritos, porcentaje | Agregado por evento | Barras de ocupacion % + lineas de umbral | Que eventos estan en riesgo o saturacion | Alta |
| Cupo por proyecto | /api/v1/admin/estadisticas/proyectos-cupo | Proyecto | evento_id, empresa_id | capacidad_max, cupo_actual | Agregado por proyecto | Semaforo de barras + ranking | Donde abrir cupo o activar difusion | Alta |
| Alumnos por empresa | /api/v1/admin/estadisticas/alumnos-por-empresa | Empresa | evento_id | cantidad_inscritos | Distribucion | Barras horizontales ordenadas | Que empresas concentran demanda | Media |
| Alumnos por carrera | /api/v1/admin/estadisticas/alumnos-por-carrera | Carrera + semestre | evento_id, carrera | carrera, cantidad, por_semestre | Distribucion segmentada | Barras horizontales + drill por semestre | Que carreras participan mas o menos | Alta |
| Timeline de inscripciones | /api/v1/admin/estadisticas/inscripciones-timeline | Temporal | evento_id, empresa_id, proyecto_id, carrera, fecha_inicio, fecha_fin, horas, ventana | timestamp, cantidad_nueva, acumulado | Serie temporal | Linea doble (nuevas y acumulado) | A que ritmo crecen las inscripciones | Alta |
| Ratio inscritos | /api/v1/admin/estadisticas/ratio-inscritos | Proyecto | evento_id, empresa_id, carrera | registrados, inscritos, ratio_inscripcion | Conversion por proyecto | Barras agrupadas + etiqueta de ratio | Que proyectos convierten mejor | Alta |
| Embudo de conversion | /api/v1/admin/estadisticas/embudo-conversion | Evento/empresa/proyecto | evento_id, empresa_id, proyecto_id, carrera, fecha_inicio, fecha_fin | etapas, conversion_pct, sin_asignar | Funnel agregado | Embudo + KPI de conversion | Cuanta friccion hay entre registro e inscripcion | Alta |
| Alertas de proyectos | /api/v1/admin/estadisticas/alertas-proyectos | Proyecto | evento_id, empresa_id, proyecto_id, min_ocupacion_pct, ocupacion_alta_pct | flags, ocupacion_pct | Senales de riesgo | Lista priorizada con badges de alerta | Que hay que atender primero hoy | Alta |
| Comparativa de eventos | /api/v1/admin/estadisticas/comparativa-eventos | Evento vs evento | evento_actual_id, evento_anterior_id | radar, deltas | Comparativo | Radar + tarjetas delta | Mejoramos o empeoramos vs evento anterior | Media |
| Reinscripcion scatter | /api/v1/admin/estadisticas/reinscripcion-scatter | Alumno agregado | evento_id | eventos_registrado, proyectos_inscrito, cantidad_alumnos | Distribucion bivariada | Scatter plot | Que patron de recurrencia tienen alumnos | Baja |
| Logs recientes | /api/v1/admin/estadisticas/logs-recientes | Auditoria | limite | tipo_evento, timestamp, id_matricula, ip_origen | Eventos de auditoria | Tabla temporal | Que incidentes recientes impactan operacion | Baja |
