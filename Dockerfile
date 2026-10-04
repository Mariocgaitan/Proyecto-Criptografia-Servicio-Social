# ==========================================
# ETAPA 1: Build del Frontend (Vite + React)
# ==========================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

# Vite inline las VITE_* en build time; si faltan, el bundle queda con el
# fallback "TU_GOOGLE_CLIENT_ID" y el login con Google rompe.
ARG VITE_GOOGLE_CLIENT_ID=""
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ==========================================
# ETAPA 2: Backend (FastAPI) + Frontend compilado
# + Postgres y Redis embebidos en el mismo contenedor
# (para desplegar como un único servicio Docker en Render, sin docker-compose)
# ==========================================
FROM python:3.12-slim AS backend

ENV DEBIAN_FRONTEND=noninteractive

# Evita que los paquetes .deb intenten arrancar servicios via init durante el
# build (no hay systemd/sysvinit dentro del build de Docker).
RUN echo "exit 101" > /usr/sbin/policy-rc.d && chmod +x /usr/sbin/policy-rc.d
# postgresql-common crea un cluster "main" automáticamente al instalar el
# paquete `postgresql` — lo desactivamos porque manejamos nuestro propio
# PGDATA a mano en entrypoint.sh (necesitamos esa ruta libre para poder
# montar ahí un Persistent Disk de Render más adelante).
RUN mkdir -p /etc/postgresql-common && \
    echo "create_main_cluster = false" > /etc/postgresql-common/createcluster.conf

RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc \
        libpq-dev \
        curl \
        postgresql \
        redis-server \
        gosu \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

RUN groupadd --system app && useradd --system --gid app --home /app app

WORKDIR /app/backend

COPY backend/requirements.txt ./
RUN pip install -r requirements.txt

COPY backend/ ./

RUN mkdir -p /app/frontend/dist
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

RUN chown -R app:app /app

COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# El contenedor arranca como root: entrypoint.sh necesita privilegios para
# inicializar Postgres/Redis y luego baja de privilegios (gosu) para correr
# tanto esos servicios como gunicorn con sus propios usuarios de sistema.
# gunicorn termina corriendo como "app", nunca como root.

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
    CMD curl --fail --silent --show-error http://127.0.0.1:8000/api/v1/health || exit 1

ENTRYPOINT ["/app/entrypoint.sh"]
