# ==========================================
# ETAPA 1: Build del Frontend (Vite + React)
# ==========================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

# Copiar package.json e instalar dependencias
COPY frontend/package*.json ./
RUN npm ci

# Copiar el código fuente de React y compilar
COPY frontend/ ./
RUN npm run build

# ==========================================
# ETAPA 2: Build del Backend (FastAPI)
# ==========================================
FROM python:3.11-slim

WORKDIR /app

# Dependencias del sistema necesarias para compilar algunas libs de Python
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Configurar entorno de Python
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Instalar dependencias del backend
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código del backend
COPY backend/ ./backend/

# Crear la carpeta donde FastAPI servirá los estáticos
RUN mkdir -p /app/frontend/dist

# TRUCO MÁGICO: Copiar el build compilado de la Etapa 1 a la imagen de Python
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Exponer el puerto
EXPOSE 8000

# Script de arranque usando Uvicorn
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000", "--forwarded-allow-ips", "*"]
