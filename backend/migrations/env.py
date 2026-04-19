import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy.ext.asyncio import create_async_engine

# Importar todos los modelos para que Alembic los detecte
from app.db.models_import import Base  # noqa: F401

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Corre las migraciones usando el motor async."""
    from app.core.config import settings
    engine = create_async_engine(settings.DATABASE_URL)
    async with engine.begin() as conn:
        await conn.run_sync(do_run_migrations)
    await engine.dispose()


def _local_port_in_use(port: int) -> bool:
    import socket
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        return sock.connect_ex(("127.0.0.1", port)) == 0


def run_migrations_online() -> None:
    from app.core.config import settings
    from app.db.ssh_manager import ssh_tunnel_manager

    # In prod we run alembic via `docker compose exec app ...`, so the app
    # process already owns the tunnel. Reuse it instead of colliding on ports.
    reuse_existing_tunnel = (
        settings.USE_SSH_TUNNEL and _local_port_in_use(settings.LOCAL_BIND_PORT)
    )
    started_here = False

    if settings.USE_SSH_TUNNEL and not reuse_existing_tunnel:
        ssh_tunnel_manager.start()
        started_here = True

    try:
        asyncio.run(run_async_migrations())
    finally:
        if started_here:
            ssh_tunnel_manager.stop()



if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
