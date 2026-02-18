# SID — Sistema de Inscripción Dinámica

Sistema de pre-registro e inscripción con QR dinámico para eventos del Tec de Monterrey.

## Requisitos

- [uv](https://docs.astral.sh/uv/) (gestor de paquetes Python)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

## Setup inicial (primera vez)

### 1. Levantar la base de datos

```powershell
# Desde la raíz del proyecto
docker compose up -d
```

Verifica que el contenedor esté corriendo:
```powershell
docker compose ps
```

### 2. Instalar dependencias Python

```powershell
cd backend
uv sync
```

### 3. Configurar variables de entorno

El archivo `backend/.env` ya está configurado para desarrollo local. No necesitas cambiarlo.

### 4. Aplicar migraciones

```powershell
cd backend
uv run alembic upgrade head
```

### 5. ⚠️ Insertar datos iniciales (OBLIGATORIO)

> Sin este paso el formulario de registro mostrará **"No hay eventos disponibles"**.

```powershell
# Desde la carpeta backend/
uv run python seed.py
```

Deberías ver:
```
🌱 Ejecutando seed de datos iniciales...
✅ 4 eventos insertados correctamente:
   - Invierno 2026 (inactivo)
   - Febrero-Junio 2026 (ACTIVO)
   - Verano 2026 (inactivo)
   - Agosto-Diciembre 2026 (inactivo)
✅ Seed completado.
```

> Si ya corriste el seed antes, el script detecta los eventos existentes y no duplica nada.

### 6. Correr el servidor

```powershell
# Desde la carpeta backend/
uv run uvicorn app.main:app --reload --port 8000
```

Abre tu navegador en: **http://localhost:8000**

---

## Estructura del proyecto

```
backend/
├── app/
│   ├── core/        # Configuración y seguridad
│   ├── db/          # Motor async y sesiones
│   ├── models/      # Modelos SQLAlchemy
│   ├── schemas/     # Schemas Pydantic
│   ├── routers/     # Endpoints FastAPI
│   ├── services/    # Lógica de negocio
│   ├── templates/   # Jinja2 HTML
│   └── static/      # CSS, JS
├── migrations/      # Alembic
├── pyproject.toml   # Dependencias (uv)
└── .env             # Variables locales
```

## Comandos útiles

```powershell
# Ver logs de PostgreSQL
docker compose logs db -f

# Conectarse a la DB directamente
docker compose exec db psql -U sid_user -d sid_db

# Generar nueva migración (tras cambiar modelos)
uv run alembic revision --autogenerate -m "descripcion_del_cambio"

# Revertir última migración
uv run alembic downgrade -1

# Parar Docker
docker compose down
```

## Etapas del proyecto

| Etapa | Descripción | Estado |
|-------|-------------|--------|
| 1 | Pre-registro de alumnos | ✅ Completada |
| 2 | Login + JWT + TOTP | 🔜 Pendiente |
| 3 | Dashboard alumno + QR dinámico | 🔜 Pendiente |
| 4 | Módulo empresa + escáner | 🔜 Pendiente |
| 5 | Panel administrador | 🔜 Pendiente |
