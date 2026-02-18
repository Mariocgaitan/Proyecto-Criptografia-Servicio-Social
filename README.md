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
# Desde la carpeta backend/
cd backend
uv run alembic upgrade head
```

### 5. Insertar eventos de prueba (seed)

```powershell
uv run python -c "
import asyncio
from app.db.session import AsyncSessionLocal
from app.models.evento import Evento

async def seed():
    async with AsyncSessionLocal() as db:
        eventos = [
            Evento(nombre='Invierno 2026', periodo='INVIERNO', anio=2026, activo=False),
            Evento(nombre='Febrero-Junio 2026', periodo='FEB_JUN', anio=2026, activo=True),
            Evento(nombre='Verano 2026', periodo='VERANO', anio=2026, activo=False),
            Evento(nombre='Agosto-Diciembre 2026', periodo='AGO_DIC', anio=2026, activo=False),
        ]
        db.add_all(eventos)
        await db.commit()
        print('✅ Eventos insertados')

asyncio.run(seed())
"
```

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
