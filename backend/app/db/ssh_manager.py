import logging
from sshtunnel import SSHTunnelForwarder
from app.core.config import settings

logger = logging.getLogger(__name__)

class SSHTunnelManager:
    def __init__(self):
        self.tunnel = None

    def start(self):
        if not settings.USE_SSH_TUNNEL:
            return

        try:
            self.tunnel = SSHTunnelForwarder(
                (settings.SSH_HOST, settings.SSH_PORT),
                ssh_username=settings.SSH_USER,
                ssh_pkey=settings.SSH_PKEY_PATH,
                remote_bind_address=(settings.REMOTE_DB_HOST, settings.REMOTE_DB_PORT),
                local_bind_address=("127.0.0.1", settings.LOCAL_BIND_PORT),
            )
            self.tunnel.start()
            print(f"🚀 Túnel SSH establecido en puerto {self.tunnel.local_bind_port}")
        except Exception as e:
            print(f"❌ Error al iniciar el túnel SSH: {e}")
            raise

    def stop(self):
        if self.tunnel and self.tunnel.is_active:
            self.tunnel.stop()
            print("🛑 Túnel SSH cerrado")


ssh_tunnel_manager = SSHTunnelManager()
