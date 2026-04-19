# Feria Servicio Social

FastAPI + Vite/React. Auth con Google + 2FA, Postgres, Redis, SSH tunnel a DB remota.

## Desarrollo local

```bash
# Backend
cd backend
uv venv && source .venv/bin/activate
uv pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload

# Frontend
cd frontend
npm ci
npm run dev
```

## Deploy a producción (AWS EC2 + Cloudflare)

### Arquitectura

```
Cliente ──HTTPS──▶ Cloudflare ──HTTP──▶ EC2:80 nginx ──▶ app:8000 (gunicorn+uvicorn)
                                                          │
                                                          ├──▶ redis (contenedor)
                                                          └──▶ Postgres remoto vía SSH tunnel
```

Secretos: AWS Parameter Store bajo `/feria/prod/*`. Imágenes: GHCR. CI/CD: GitHub Actions.

### Setup inicial (una sola vez por servidor)

1. **EC2**: Elastic IP asignada, SG con 22/80/443, IAM Role con `AmazonSSMReadOnlyAccess`.
2. **DNS**: en Cloudflare, `A @` y `A www` apuntando al Elastic IP (proxy activado).
3. **Bootstrap del EC2**:
   ```bash
   ssh webservice@<elastic-ip>
   curl -fsSL https://raw.githubusercontent.com/Mariocgaitan/Proyecto-Criptografia-Servicio-Social/main/scripts/deploy/setup-ec2.sh | sudo bash
   ```
4. **SSH key** para el túnel a la DB:
   ```bash
   # Copia la key privada a /home/webservice/.ssh/db_tunnel_db_key y asegura permisos
   chmod 600 /home/webservice/.ssh/db_tunnel_db_key
   ```
5. **Secretos a SSM** (desde tu máquina):
   ```bash
   ./scripts/deploy/seed-ssm.sh path/a/tu/.env
   ```
6. **Login a GHCR en el EC2** (una vez):
   ```bash
   echo <PAT_con_read_packages> | docker login ghcr.io -u <tu-user> --password-stdin
   ```
7. **`.env.production` en el EC2**: editar `/home/webservice/app/.env.production` con `REDIS_PASSWORD` fuerte.
8. **GitHub Secrets** (Settings → Secrets and variables → Actions):
   - `EC2_HOST` = `52.45.12.70`
   - `EC2_USER` = `webservice`
   - `EC2_SSH_KEY` = llave privada SSH para el deploy (NO la del túnel DB)
9. **Google OAuth**: agregar `https://feriaserviciosocial.com` y `https://www.feriaserviciosocial.com` a los authorized origins.

### Flujo diario

```
git push main  →  GH Actions:  tests  →  build+push GHCR  →  SSH EC2:
                                                              docker pull
                                                              docker compose up -d
                                                              alembic upgrade head
```

En ~3-5 min el cambio está en `https://feriaserviciosocial.com`.

### Operación manual en el EC2

```bash
ssh webservice@52.45.12.70
cd ~/app

# Estado
docker compose -f docker-compose.prod.yml ps

# Logs
docker compose -f docker-compose.prod.yml logs -f app
docker compose -f docker-compose.prod.yml logs -f nginx

# Restart de un servicio
docker compose -f docker-compose.prod.yml restart app

# Migraciones manuales
docker compose -f docker-compose.prod.yml exec app alembic -c /app/backend/alembic.ini upgrade head

# Rollback a una imagen anterior
APP_IMAGE=ghcr.io/mariocgaitan/proyecto-criptografia-servicio-social:sha-<commit> \
  docker compose -f docker-compose.prod.yml --env-file .env.production up -d app
```

### Troubleshooting

| Síntoma | Dónde mirar |
|---------|-------------|
| 502/504 del navegador | `docker compose logs nginx` y `docker compose logs app` |
| `app` no queda healthy | `docker inspect feria_app --format '{{json .State.Health}}'` |
| SSH tunnel falla | `.env.production` → `USE_SSH_TUNNEL=true` y permisos de la key `600` |
| Secretos no cargan de SSM | IAM Role y política `AmazonSSMReadOnlyAccess` en el EC2 |
| Rate limit 429 en `/api/auth/` | Es intencional (10 req/min/IP). Ajustar en `nginx/nginx.conf` |

### Escalado futuro (fuera de alcance de este deploy)

- Mover el SSH tunnel a un sidecar `autossh` → habilita `WEB_CONCURRENCY>1`.
- Migrar Postgres remoto a RDS y quitar el tunnel.
- ALB + varios EC2 detrás para HA.
- Cloudflare Full (strict) + cert Let's Encrypt en nginx (hoy: Flexible).
