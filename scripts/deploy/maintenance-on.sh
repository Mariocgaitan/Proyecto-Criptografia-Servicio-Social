#!/usr/bin/env bash
# Activa el modo mantenimiento: nginx devolverá 503 con la página custom
# para todo el tráfico excepto /healthz. Idempotente.
#
# Uso: ./scripts/deploy/maintenance-on.sh
set -euo pipefail

cd "$(dirname "$0")/../.."

FLAG="nginx/state/maintenance.on"

touch "$FLAG"
echo "==> Maintenance flag creado: $FLAG"

if docker ps --format '{{.Names}}' | grep -q '^feria_nginx$'; then
    docker exec feria_nginx nginx -s reload
    echo "==> nginx reloaded — mantenimiento ACTIVO"
else
    echo "==> feria_nginx no está corriendo; el flag queda listo para el próximo up."
fi
