#!/usr/bin/env bash
# Sube variables de un archivo .env a AWS Parameter Store bajo /feria/prod/*
# como SecureString. Idempotente (usa --overwrite).
#
# Uso:
#   ./scripts/deploy/seed-ssm.sh path/al/.env.production.local
#   AWS_REGION=us-east-1 PARAM_PREFIX=/feria/prod ./scripts/deploy/seed-ssm.sh .env.prod
#
# Variables que SE SUBEN (secretos reales):
#   JWT_SECRET_KEY, QR_ENCRYPTION_KEY, GOOGLE_CLIENT_ID,
#   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM_EMAIL,
#   DATABASE_URL, SSH_HOST, SSH_PORT, SSH_USER,
#   REMOTE_DB_HOST, REMOTE_DB_PORT, LOCAL_BIND_PORT,
#   REMOTE_REDIS_HOST, REMOTE_REDIS_PORT, LOCAL_REDIS_BIND_PORT,
#   SENTRY_DSN
#
# Variables NO secret que NO se suben (viven en .env.production del EC2):
#   APP_ENV, DEBUG, SHOW_DOCS, ALLOWED_ORIGINS, USE_SSH_TUNNEL, REDIS_PASSWORD,
#   WEB_CONCURRENCY, TEST_ROLE_SWITCH_*, MAX_FAILED_LOGIN_ATTEMPTS, etc.

set -euo pipefail

ENV_FILE="${1:-backend/.env.production.local}"
PARAM_PREFIX="${PARAM_PREFIX:-/feria/prod}"
AWS_REGION="${AWS_REGION:-us-east-1}"

if [ ! -f "$ENV_FILE" ]; then
    echo "Archivo no encontrado: $ENV_FILE" >&2
    echo "Uso: $0 [ruta/al/.env.production.local]" >&2
    exit 1
fi

SECRETS_TO_UPLOAD=(
    JWT_SECRET_KEY
    QR_ENCRYPTION_KEY
    GOOGLE_CLIENT_ID
    SMTP_HOST
    SMTP_PORT
    SMTP_USER
    SMTP_PASSWORD
    SMTP_FROM_EMAIL
    DATABASE_URL
    SSH_HOST
    SSH_PORT
    SSH_USER
    REMOTE_DB_HOST
    REMOTE_DB_PORT
    LOCAL_BIND_PORT
    REMOTE_REDIS_HOST
    REMOTE_REDIS_PORT
    LOCAL_REDIS_BIND_PORT
    SENTRY_DSN
    JWT_ALGORITHM
    ACCESS_TOKEN_EXPIRE_MINUTES
    REFRESH_TOKEN_EXPIRE_HOURS
    PRE_AUTH_TOKEN_EXPIRE_MINUTES
)

log() { echo -e "\033[1;34m==>\033[0m $*"; }

# shellcheck disable=SC1090
set -a
source "$ENV_FILE"
set +a

uploaded=0
skipped=0
for key in "${SECRETS_TO_UPLOAD[@]}"; do
    value="${!key:-}"
    if [ -z "$value" ]; then
        echo "  - $key: vacío en $ENV_FILE, skip"
        skipped=$((skipped + 1))
        continue
    fi
    param_name="${PARAM_PREFIX}/${key}"
    aws ssm put-parameter \
        --region "$AWS_REGION" \
        --name "$param_name" \
        --value "$value" \
        --type SecureString \
        --overwrite \
        --no-cli-pager \
        >/dev/null
    echo "  ✔ $param_name"
    uploaded=$((uploaded + 1))
done

log "Subidos: $uploaded  |  Skipped: $skipped"
log "Verifica con:  aws ssm get-parameters-by-path --path $PARAM_PREFIX/ --recursive --with-decryption --region $AWS_REGION"
