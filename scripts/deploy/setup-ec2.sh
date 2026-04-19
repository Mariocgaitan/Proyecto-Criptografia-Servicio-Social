#!/usr/bin/env bash
# Bootstrap idempotente del EC2 para correr Feria Servicio Social en producción.
# Uso (SSH al EC2 como usuario webservice o root con sudo):
#   curl -fsSL https://raw.githubusercontent.com/Mariocgaitan/Proyecto-Criptografia-Servicio-Social/main/scripts/deploy/setup-ec2.sh | bash
# o:
#   sudo bash scripts/deploy/setup-ec2.sh

set -euo pipefail

APP_USER="${APP_USER:-webservice}"
APP_DIR="/home/${APP_USER}/app"
REPO_URL="${REPO_URL:-https://github.com/Mariocgaitan/Proyecto-Criptografia-Servicio-Social.git}"

log() { echo -e "\033[1;34m==>\033[0m $*"; }

require_root() {
    if [ "$(id -u)" -ne 0 ]; then
        echo "Este script requiere sudo/root." >&2
        exit 1
    fi
}

install_docker() {
    if command -v docker >/dev/null 2>&1; then
        log "Docker ya instalado ($(docker --version))"
        return
    fi
    log "Instalando Docker Engine + plugin compose"
    apt-get update
    apt-get install -y ca-certificates curl gnupg
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
        | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
        > /etc/apt/sources.list.d/docker.list
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    systemctl enable --now docker
}

setup_app_user() {
    if ! id "$APP_USER" >/dev/null 2>&1; then
        log "Creando usuario $APP_USER"
        useradd --create-home --shell /bin/bash "$APP_USER"
    fi
    log "Agregando $APP_USER al grupo docker"
    usermod -aG docker "$APP_USER"
}

setup_firewall() {
    if ! command -v ufw >/dev/null 2>&1; then
        log "Instalando UFW"
        apt-get install -y ufw
    fi
    log "Configurando UFW (22, 80, 443)"
    ufw --force reset >/dev/null
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw --force enable
}

prepare_app_dir() {
    log "Preparando $APP_DIR"
    mkdir -p "$APP_DIR"
    chown "$APP_USER:$APP_USER" "$APP_DIR"

    if [ ! -d "$APP_DIR/.git" ]; then
        log "Clonando repo (solo para obtener docker-compose.prod.yml y nginx/)"
        sudo -u "$APP_USER" git clone --depth 1 "$REPO_URL" "$APP_DIR"
    else
        log "Repo ya clonado; haciendo git pull"
        sudo -u "$APP_USER" git -C "$APP_DIR" pull --ff-only
    fi

    if [ ! -f "$APP_DIR/.env.production" ]; then
        log "Copiando .env.production.example → .env.production (edítalo con tus valores)"
        cp "$APP_DIR/.env.production.example" "$APP_DIR/.env.production"
        chown "$APP_USER:$APP_USER" "$APP_DIR/.env.production"
        chmod 600 "$APP_DIR/.env.production"
        echo
        echo "⚠️  Edita $APP_DIR/.env.production con REDIS_PASSWORD y cualquier otro valor local"
        echo
    fi
}

setup_aws_cli() {
    if command -v aws >/dev/null 2>&1; then
        log "AWS CLI ya instalado"
        return
    fi
    log "Instalando AWS CLI v2 (para seed-ssm.sh)"
    apt-get install -y unzip
    tmp=$(mktemp -d)
    curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "$tmp/awscli.zip"
    unzip -q "$tmp/awscli.zip" -d "$tmp"
    "$tmp/aws/install"
    rm -rf "$tmp"
}

final_instructions() {
    cat <<EOF

================================================================================
✅ Bootstrap terminado

Pasos manuales restantes:

1. Edita  $APP_DIR/.env.production
     - REDIS_PASSWORD (genera uno fuerte)
     - WEB_CONCURRENCY (deja 1 a menos que ya no uses SSH tunnel)

2. Copia la SSH key para el túnel a la DB a:
     /home/$APP_USER/.ssh/db_tunnel_db_key
     chmod 600 /home/$APP_USER/.ssh/db_tunnel_db_key
     chown $APP_USER:$APP_USER /home/$APP_USER/.ssh/db_tunnel_db_key

3. Sube los secretos a SSM (desde tu máquina local):
     ./scripts/deploy/seed-ssm.sh backend/.env.production.local

4. Confirma que el IAM Role del EC2 incluye AmazonSSMReadOnlyAccess:
     aws sts get-caller-identity
     aws ssm get-parameters-by-path --path /feria/prod/ --recursive --with-decryption | head

5. Primer deploy manual (solo la primera vez):
     cd $APP_DIR
     docker login ghcr.io   # con un PAT con read:packages
     git push origin main   # dispara GitHub Actions

================================================================================
EOF
}

main() {
    require_root
    install_docker
    setup_app_user
    setup_firewall
    prepare_app_dir
    setup_aws_cli
    final_instructions
}

main "$@"
