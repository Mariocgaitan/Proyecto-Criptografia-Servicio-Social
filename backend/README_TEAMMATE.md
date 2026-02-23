# Guía de Sincronización para el Equipo

Para evitar problemas con el registro de usuarios después de estos cambios, por favor sigue estos pasos una vez que hagas pull:

1. **Actualizar la Base de Datos**:
   Ejecuta las nuevas migraciones para crear la tabla de padrón:
   ```bash
   cd backend
   alembic upgrade head
   ```

2. **Poblar el Padrón**:
   Ejecuta el script de seed para insertar los alumnos autorizados (necesario para el registro):
   ```bash
   python seed.py
   ```

3. **Datos de Prueba**:
   Puedes usar las siguientes matrículas para probar el registro:
   - `A01234567` (JUAN PEREZ LOPEZ)
   - `A07654321` (MARIA GARCIA MARTINEZ)
   - `A01659057` (MARIO G REYNA)

Cualquier duda, avísame.
