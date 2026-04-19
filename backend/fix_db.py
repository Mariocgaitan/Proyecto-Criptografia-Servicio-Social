import asyncio
from sqlalchemy import text
from app.db.session import AsyncSessionLocal
from app.db.ssh_manager import ssh_tunnel_manager
from app.core.config import settings
import traceback

async def force_stamp_and_create():
    try:
        async with AsyncSessionLocal() as db:
            await db.execute(text('DROP TABLE IF EXISTS google_nonces CASCADE'))
            await db.execute(text('''
                CREATE TABLE google_nonces (
                    id SERIAL PRIMARY KEY,
                    nonce VARCHAR(36) NOT NULL UNIQUE,
                    nonce_hash VARCHAR(64) NOT NULL UNIQUE,
                    expira_en TIMESTAMP WITH TIME ZONE NOT NULL,
                    usado BOOLEAN NOT NULL DEFAULT FALSE,
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
                )
            '''))
            await db.execute(text('DELETE FROM alembic_version'))
            await db.execute(text("INSERT INTO alembic_version (version_num) VALUES ('h1a2b3c4d5e6')"))
            await db.commit()
        print('DB Fixed directly: Table created and alembic stamped to head.')
    except Exception as e:
        print('Error fixing DB:')
        traceback.print_exc()

if settings.USE_SSH_TUNNEL:
    ssh_tunnel_manager.start()
try:
    asyncio.run(force_stamp_and_create())
finally:
    if settings.USE_SSH_TUNNEL:
        ssh_tunnel_manager.stop()
