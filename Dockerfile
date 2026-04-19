# ==========================================
# ETAPA 1: Build del Frontend (Vite + React)
# ==========================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ==========================================
# ETAPA 2: Backend (FastAPI) + Frontend compilado
# ==========================================
FROM python:3.12-slim AS backend

RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc \
        libpq-dev \
        curl \
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
USER app

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
    CMD curl --fail --silent --show-error http://127.0.0.1:8000/api/v1/health || exit 1

# WEB_CONCURRENCY=1 por defecto: el SSH tunnel usa puertos fijos y no soporta
# múltiples workers forkeados. Para escalar horizontalmente mover el tunnel a un
# sidecar (autossh) y subir WEB_CONCURRENCY.
CMD ["sh", "-c", "gunicorn app.main:app \
    --worker-class uvicorn.workers.UvicornWorker \
    --workers ${WEB_CONCURRENCY:-1} \
    --bind 0.0.0.0:8000 \
    --timeout 60 \
    --graceful-timeout 30 \
    --max-requests 1000 \
    --max-requests-jitter 100 \
    --access-logfile - \
    --error-logfile - \
    --forwarded-allow-ips=*"]
