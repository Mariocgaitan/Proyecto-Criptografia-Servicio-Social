#!/usr/bin/env bash
# Desactiva el modo mantenimiento: nginx vuelve a enrutar al backend. Idempotente.
#
# Uso: ./scripts/deploy/maintenance-off.sh
set -euo pipefail

cd "$(dirname "$0")/../.."

FLAG="nginx/state/maintenance.on"

rm -f "$FLAG"
echo "==> Maintenance flag eliminado."

if docker ps --format '{{.Names}}' | grep -q '^feria_nginx$'; then
    docker exec feria_nginx nginx -s reload
    echo "==> nginx reloaded — tráfico normal RESTAURADO"
else
    echo "==> feria_nginx no está corriendo; nada que recargar."
fi
