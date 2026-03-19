## Plan: Reestructura Admin en Estadísticas y Dashboard

Separar claramente el enfoque funcional: Estadísticas quedará para métricas de negocio (usuarios, empresas, eventos, inscripciones) con dos vistas internas (General y Particular), mientras Dashboard se convertirá en observabilidad del sistema (salud, login activity, requests por minuto y estado operativo). Se mantendrán dos tabs principales separadas y en Estadísticas se usarán tabs superiores para General/Particular. Para requests por minuto se implementará nueva infraestructura de métricas y en Dashboard el refresco será manual.

**Steps**
1. Fase 1 - Definición de contratos y navegación base.
2. Documentar contratos de datos por tab y subvista para evitar acoplamiento entre UI y queries: Estadísticas General, Estadísticas Particular y Dashboard Sistema. Esto incluye payloads para KPI cards, series de gráficas y tablas, además de estados vacíos y errores.
3. Ajustar navegación en Admin para conservar dos tabs separadas: Dashboard y Estadísticas, con textos y objetivos distintos en sectionMeta y command palette. Esta fase bloquea el resto porque define el flujo final de usuario.
4. Fase 2 - Estadísticas (negocio) dividida en General y Particular.
5. En la vista General de Estadísticas, dejar solo análisis agregados globales de negocio (usuarios, empresas, carreras, ocupación, tendencia de inscripciones) y retirar del render todo lo que sea telemetría de sistema.
6. En la vista Particular de Estadísticas, implementar drilldown por filtros jerárquicos (evento, empresa, proyecto, carrera, rango de fechas) y asegurar que todos los widgets de esa vista consuman un mismo objeto de filtros para evitar inconsistencias de query.
7. Reorganizar carga de datos de Estadísticas para que cada subvista haga fetch únicamente de endpoints necesarios y comparta utilidades de transformación (por ejemplo formato horario y porcentajes), minimizando llamadas redundantes.
8. Fase 3 - Dashboard como sistema/observabilidad.
9. Crear infraestructura backend para métricas de sistema con middleware HTTP que registre request_timestamp, endpoint, método, status_code y duración; persistir en tabla dedicada para consultas agregadas por minuto.
10. Crear endpoints admin de sistema para: requests por minuto, distribución por status, latencia agregada, logins exitosos/fallidos por ventana y resumen operativo (uptime o estado equivalente disponible).
11. Migrar el render de Dashboard para mostrar exclusivamente tarjetas y gráficas de sistema, con acción de refresco manual y sin dependencia de datasets de negocio de proyectos/empresas.
12. Fase 4 - Integración, seguridad y compatibilidad.
13. Aplicar autorización admin a todos los nuevos endpoints de sistema y validar que no se expongan campos sensibles (IP o user-agent) en respuestas UI si no son requeridos.
14. Implementar manejo uniforme de loading/error/empty state para ambas tabs (Dashboard y Estadísticas) de modo que fallos parciales no rompan la pantalla completa.
15. Fase 5 - Verificación y rollout.
16. Ejecutar validaciones backend (rutas, agregaciones por minuto, filtros de fechas, performance básica) y frontend (navegación tabs, sub-tabs General/Particular, refresco manual de Dashboard).
17. Cerrar con pruebas de regresión funcional en admin: CRUD actual de proyectos/empresas/eventos no debe afectarse por la nueva estructura visual.

**Relevant files**
- /home/alaiinx/codigos/Algebras_modernas/Proyecto-Criptografia-Servicio-Social/frontend/src/pages/admin/Dashboard.jsx - Cambiar layout y contenido de la sección overview para métricas de sistema; actualizar sectionMeta y navegación.
- /home/alaiinx/codigos/Algebras_modernas/Proyecto-Criptografia-Servicio-Social/frontend/src/pages/admin/EstadisticasPanel.jsx - Dividir en sub-tabs General/Particular y separar fuentes de datos por subvista.
- /home/alaiinx/codigos/Algebras_modernas/Proyecto-Criptografia-Servicio-Social/frontend/src/lib/api.js - Reutilizar helper de endpoints para nuevas rutas de dashboard sistema.
- /home/alaiinx/codigos/Algebras_modernas/Proyecto-Criptografia-Servicio-Social/backend/app/routers/estadisticas.py - Mantener aquí endpoints de negocio y ajustar contratos/filtros para vistas General/Particular.
- /home/alaiinx/codigos/Algebras_modernas/Proyecto-Criptografia-Servicio-Social/backend/app/services/estadisticas_service.py - Consolidar consultas de negocio y filtros consistentes para ambas sub-vistas.
- /home/alaiinx/codigos/Algebras_modernas/Proyecto-Criptografia-Servicio-Social/backend/app/main.py - Registrar middleware de captura de métricas y nuevas rutas de sistema.
- /home/alaiinx/codigos/Algebras_modernas/Proyecto-Criptografia-Servicio-Social/backend/app/core/limiter.py - Referencia para exponer métricas de rate-limit si se incluyen en dashboard sistema.
- /home/alaiinx/codigos/Algebras_modernas/Proyecto-Criptografia-Servicio-Social/backend/migrations/versions - Agregar migración de tabla de métricas por request/minuto.

**Verification**
1. Backend: correr migraciones y validar nuevos endpoints de sistema con respuestas no vacías y agregación correcta por minuto en ventanas de 15m, 1h y 24h.
2. Backend: validar que endpoints de Estadísticas sigan aplicando filtros correctamente en General/Particular y que no cambien KPIs existentes fuera del alcance.
3. Frontend: verificar que Dashboard solo muestre métricas de sistema y que el botón de refresco manual recargue sin navegación completa.
4. Frontend: verificar tabs en Estadísticas (General/Particular) y consistencia visual de filtros y gráficas al cambiar contexto.
5. Regresión: probar navegación completa de admin (Dashboard, Estadísticas, Proyectos, Empresas, Eventos, Gestión) y command palette sin errores.

**Decisions**
- Se mantienen dos tabs principales separadas: Dashboard y Estadísticas.
- Estadísticas se divide con tabs superiores en General y Particular.
- Dashboard de sistema usará infraestructura nueva de métricas (middleware + almacenamiento).
- Actualización de Dashboard será manual mediante acción de refresco.
- Scope incluido: reestructura funcional de tabs, contratos de datos, backend endpoints/métricas y UI resultante.
- Scope excluido: alerting en tiempo real, WebSockets, monitoreo de infraestructura externa (CPU/memoria host), exportaciones avanzadas nuevas.

**Further Considerations**
1. Definir retención de métricas request-level (por ejemplo 7, 30 o 90 días) para controlar crecimiento de tabla.
2. Evaluar si conviene separar router de sistema en un módulo dedicado (por ejemplo admin system metrics) para no sobrecargar estadisticas.py.
3. Si el volumen de requests crece, planear agregación por lotes en background para reducir costo de escritura por request.
