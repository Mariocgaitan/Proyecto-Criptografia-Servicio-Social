-- ══════════════════════════════════════════════════════════════════════
--  DATOS DE PRUEBA — Etapa 4
--  Ejecutar solo si empresas/proyectos están vacíos.
--  Para limpiar después: ver sección DELETE al final.
-- ══════════════════════════════════════════════════════════════════════

-- 1. Verificar eventos disponibles (confirmar id_evento activo)
SELECT id_evento, nombre, periodo, activo FROM eventos ORDER BY id_evento;

-- 2. Insertar empresas de prueba
INSERT INTO empresas (nombre_empresa, logo_url) VALUES
    ('CEMEX',       NULL),
    ('Banorte',     NULL),
    ('Tec Ventures',NULL)
ON CONFLICT DO NOTHING;

-- 3. Insertar proyectos de prueba (todos en id_evento=2, FEB_JUN activo)
-- capacidad_max=3, capacidad_espera_max=2 para poder probar cupo lleno y lista de espera
INSERT INTO proyectos (id_empresa, id_evento, nombre_proyecto, descripcion, capacidad_max, cupo_actual, capacidad_espera_max) VALUES
    (1, 2, 'App de Logística',        'Desarrollo de app móvil para gestión de rutas.',         3, 0, 2),
    (2, 2, 'Dashboard Financiero',    'Visualización de datos financieros en tiempo real.',      3, 0, 2),
    (3, 2, 'Plataforma de Startups',  'Portal para conectar emprendedores con inversores.',      3, 0, 2)
ON CONFLICT DO NOTHING;

-- 4. Verificar que quedó bien
SELECT
    p.id_proyecto,
    p.nombre_proyecto,
    e.nombre_empresa,
    ev.nombre AS evento,
    p.cupo_actual,
    p.capacidad_max,
    p.capacidad_espera_max
FROM proyectos p
JOIN empresas e  ON p.id_empresa = e.id_empresa
JOIN eventos  ev ON p.id_evento  = ev.id_evento
ORDER BY p.id_proyecto;


-- ══════════════════════════════════════════════════════════════════════
--  LIMPIEZA (correr esto cuando terminen de probar)
-- ══════════════════════════════════════════════════════════════════════
-- DELETE FROM inscripciones;
-- DELETE FROM lista_espera;
-- UPDATE proyectos SET cupo_actual = 0;
-- DELETE FROM proyectos;
-- DELETE FROM empresas;
