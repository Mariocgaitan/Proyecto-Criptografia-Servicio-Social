#!/bin/bash
# Entrypoint del contenedor "todo en uno": arranca Postgres y Redis locales
# (dentro del MISMO contenedor que la app), corre las migraciones de Alembic,
# y finalmente deja correr gunicorn.
#
# ADVERTENCIA: si Render no tiene un Persistent Disk montado en $PGDATA,
# el filesystem del contenedor es efimero — cada restart/redeploy vuelve a
# inicializar Postgres desde cero y se pierde todo lo que había en la BD.
# Ver notas de despliegue para adjuntar un disco persistente en esa ruta.

set -euo pipefail

PGDATA="/var/lib/postgresql/data"
PG_BIN="/usr/lib/postgresql/$(ls /usr/lib/postgresql | head -1)/bin"
REDIS_DATA_DIR="/var/lib/redis"

log() { echo "==> $*"; }

# ── Parseo de DATABASE_URL (única fuente de verdad para user/pass/db) ────────
read -r PG_USER PG_PASS PG_HOST PG_PORT PG_DB < <(python3 - <<'PY'
import os
from urllib.parse import urlparse

url = os.environ["DATABASE_URL"].replace("postgresql+asyncpg", "postgresql", 1)
u = urlparse(url)
print(u.username or "", u.password or "", u.hostname or "", u.port or 5432, (u.path or "/").lstrip("/"))
PY
)

if [ "$PG_HOST" != "127.0.0.1" ] && [ "$PG_HOST" != "localhost" ]; then
    log "DATABASE_URL apunta a '$PG_HOST' (no local) — se omite el bootstrap de Postgres embebido."
else
    mkdir -p "$PGDATA"
    chown -R postgres:postgres "$PGDATA"

    if [ ! -s "$PGDATA/PG_VERSION" ]; then
        log "Inicializando cluster de Postgres en $PGDATA (primer arranque / sin disco persistente)"
        gosu postgres "$PG_BIN/initdb" -D "$PGDATA" \
            --auth-local=trust --auth-host=scram-sha-256 --username=postgres \
            >/tmp/initdb.log 2>&1

        log "Arrancando Postgres para crear el rol y la base de datos"
        gosu postgres "$PG_BIN/pg_ctl" -D "$PGDATA" -w \
            -o "-c listen_addresses=127.0.0.1 -c port=$PG_PORT" start \
            >/tmp/pg_start.log 2>&1

        cat >/tmp/bootstrap.sql <<SQL
CREATE ROLE "$PG_USER" LOGIN PASSWORD '$PG_PASS';
CREATE DATABASE "$PG_DB" OWNER "$PG_USER";
SQL
        gosu postgres "$PG_BIN/psql" -v ON_ERROR_STOP=1 -f /tmp/bootstrap.sql
        rm -f /tmp/bootstrap.sql
    else
        log "Cluster de Postgres existente encontrado en $PGDATA (disco persistente) — reutilizando"
        gosu postgres "$PG_BIN/pg_ctl" -D "$PGDATA" -w \
            -o "-c listen_addresses=127.0.0.1 -c port=$PG_PORT" start \
            >/tmp/pg_start.log 2>&1
    fi
fi

# ── Redis local (no fatal si falla; connect_redis() en la app ya tolera esto) ─
REDIS_HOST_FROM_URL=$(python3 -c "
import os
from urllib.parse import urlparse
print(urlparse(os.environ.get('REDIS_URL', '')).hostname or '')
" || true)

if [ "$REDIS_HOST_FROM_URL" = "127.0.0.1" ] || [ "$REDIS_HOST_FROM_URL" = "localhost" ]; then
    log "Arrancando Redis local"
    mkdir -p "$REDIS_DATA_DIR"
    chown -R redis:redis "$REDIS_DATA_DIR" || true
    gosu redis redis-server \
        --bind 127.0.0.1 \
        --port 6379 \
        --requirepass "${REDIS_PASSWORD:-}" \
        --daemonize no \
        --dir "$REDIS_DATA_DIR" \
        >/tmp/redis.log 2>&1 &
else
    log "REDIS_URL apunta a '$REDIS_HOST_FROM_URL' (no local) — se omite Redis embebido."
fi

# ── Migraciones ────────────────────────────────────────────────────────────────
log "Corriendo migraciones de Alembic"
alembic upgrade head

# ── App ──────────────────────────────────────────────────────────────────────
log "Levantando gunicorn"
exec gosu app gunicorn app.main:app \
    --worker-class uvicorn.workers.UvicornWorker \
    --workers "${WEB_CONCURRENCY:-1}" \
    --bind 0.0.0.0:8000 \
    --timeout 60 \
    --graceful-timeout 30 \
    --max-requests 1000 \
    --max-requests-jitter 100 \
    --access-logfile - \
    --error-logfile - \
    --forwarded-allow-ips=*
