# Feria Servicio Social — Backend

API REST con FastAPI para la Feria de Servicio Social: pre-registro e inscripción con QR dinámico.

---

## Requisitos previos

- Python 3.12+
- [`uv`](https://docs.astral.sh/uv/) instalado
- Acceso a la llave SSH privada del servidor de BD (`~/.ssh/id_db_manager`)

---

## Configuración inicial (una sola vez)

### 1. Instalar dependencias

```bash
uv sync
```

### 2. Crear el archivo de entorno

```bash
cp ../.env.example ../.env
```

Edita el archivo `../.env` con tus valores reales (env unico compartido por frontend y backend). Si usas la **base de datos remota**, configura la sección del tunel SSH:

```env
# Habilita el túnel SSH
USE_SSH_TUNNEL=true

# Datos del servidor SSH (pide estos valores al responsable del servidor)
SSH_HOST=<ip-del-servidor>
SSH_USER=db_manager
SSH_PKEY_PATH=~/.ssh/id_db_manager

# La URL DEBE apuntar al LOCAL_BIND_PORT (5433 por defecto), no a 5432
DATABASE_URL=postgresql+asyncpg://<usuario>:<contraseña>@localhost:5433/<nombre_db>
```

> **Nota:** Si usas una BD local (Docker), deja `USE_SSH_TUNNEL=false` y el `DATABASE_URL` apuntando a tu instancia local en el puerto `5432`.

---

## Flujo de puesta en marcha

### 3. Aplicar migraciones

Esto crea todas las tablas en la base de datos. Si `USE_SSH_TUNNEL=true`, el túnel SSH se abre automáticamente.

```bash
uv run alembic upgrade head
```

### 4. Insertar datos iniciales (seed)

Inserta eventos y padrón de alumnos por defecto. Es idempotente; si los datos ya existen, no crea duplicados.

```bash
uv run python seed.py
```

### 5. Iniciar el servidor

```bash
uv run uvicorn app.main:app --reload --port 8000
```

El servidor queda disponible en [http://localhost:8000](http://localhost:8000).  
Si `USE_SSH_TUNNEL=true`, el túnel SSH se levanta automáticamente al iniciar y se cierra al detener el servidor.

---

## Diagnóstico

Si tienes problemas de conexión, puedes probar el túnel y la BD de forma aislada:

```bash
uv run python test_db_ssh.py
```

---

## Variables de entorno relevantes

| Variable | Descripción | Valor por defecto |
|---|---|---|
| `DATABASE_URL` | URL de conexión a PostgreSQL (asyncpg) | `localhost:5432/feria_db` |
| `USE_SSH_TUNNEL` | Habilita el túnel SSH | `false` |
| `SSH_HOST` | IP o hostname del servidor SSH | — |
| `SSH_PORT` | Puerto SSH | `22` |
| `SSH_USER` | Usuario SSH | — |
| `SSH_PKEY_PATH` | Ruta a la llave privada SSH | `~/.ssh/id_rsa` |
| `REMOTE_DB_HOST` | Host de PostgreSQL en el servidor remoto | `127.0.0.1` |
| `REMOTE_DB_PORT` | Puerto de PostgreSQL en el servidor remoto | `5432` |
| `LOCAL_BIND_PORT` | Puerto local donde se expone el túnel | `5433` |
| `JWT_SECRET_KEY` | Clave secreta para tokens JWT | — |
| `APP_ENV` | Entorno (`development` / `production`) | `development` |
| `DEBUG` | Activa logs SQL y docs `/docs` | `true` |
| `TEST_ROLE_SWITCH_ENABLED` | Activa cambio de rol en pruebas para un correo especifico | `false` |
| `TEST_ROLE_SWITCH_EMAIL` | Correo al que se le aplicara el rol forzado | `""` |
| `TEST_ROLE_SWITCH_ROLE` | Rol forzado (`admin`, `alumno`, `empresa`) | `""` |

### Cambio rapido de rol para pruebas

Si quieres alternar tu misma cuenta entre panel de admin y alumno sin tocar la BD, usa:

```env
TEST_ROLE_SWITCH_ENABLED=true
TEST_ROLE_SWITCH_EMAIL=a01659147@tec.mx
TEST_ROLE_SWITCH_ROLE=alumno
```

Con `TEST_ROLE_SWITCH_ROLE=alumno`, el backend asigna automaticamente los eventos activos
si ese usuario no tiene filas en `usuario_eventos`, para que puedas probar el flujo completo
de alumno sin registrarte en padrón ni usar contraseña del seed.

Para volver a admin cambia solo:

```env
TEST_ROLE_SWITCH_ROLE=admin
```

Reinicia el backend despues de cambiar estas variables.


