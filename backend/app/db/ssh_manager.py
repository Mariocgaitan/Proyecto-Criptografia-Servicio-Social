import structlog
from sshtunnel import SSHTunnelForwarder
from app.core.config import settings

logger = structlog.get_logger(__name__)

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
                remote_bind_addresses=[
                    (settings.REMOTE_DB_HOST, settings.REMOTE_DB_PORT),
                    (settings.REMOTE_REDIS_HOST, settings.REMOTE_REDIS_PORT),
                ],
                local_bind_addresses=[
                    ("127.0.0.1", settings.LOCAL_BIND_PORT),
                    ("127.0.0.1", settings.LOCAL_REDIS_BIND_PORT),
                ],
            )
            self.tunnel.start()
            ports = [str(p) for p in self.tunnel.local_bind_ports]
            logger.info("ssh_tunnel_established", ports=ports)
        except Exception as e:
            logger.error("ssh_tunnel_failed", error=str(e))
            raise

    def stop(self):
        if self.tunnel and self.tunnel.is_active:
            self.tunnel.stop()
            logger.info("ssh_tunnel_closed")


ssh_tunnel_manager = SSHTunnelManager()
