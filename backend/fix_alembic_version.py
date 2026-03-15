"""Script para corregir inconsistencias conocidas en alembic_version."""
import asyncio
from sqlalchemy import text
from app.db.session import AsyncSessionLocal
from app.db.ssh_manager import ssh_tunnel_manager
from app.core.config import settings

async def fix_and_migrate():
    print("🔧 Verificando versiones actuales en BD...")
    async with AsyncSessionLocal() as db:
        result = await db.execute(text("SELECT version_num FROM alembic_version ORDER BY version_num"))
        versions = [row[0] for row in result.fetchall()]
        print(f"   BD tiene: {versions}")

        # Corrección conocida: revisión fantasma que no existe en el repo.
        if "c3d4e5f6a7b8" in versions:
            print("   ⚠️  Encontrada revisión fantasma c3d4e5f6a7b8, corrigiendo a b2c3d4e5f6a7...")
            await db.execute(
                text(
                    """
                    UPDATE alembic_version
                    SET version_num = 'b2c3d4e5f6a7'
                    WHERE version_num = 'c3d4e5f6a7b8'
                    """
                )
            )
            await db.commit()

            result = await db.execute(text("SELECT version_num FROM alembic_version ORDER BY version_num"))
            versions = [row[0] for row in result.fetchall()]
            print(f"   ✅ Versiones corregidas: {versions}")
        else:
            print("   ✅ No se detectaron inconsistencias conocidas")

if __name__ == "__main__":
    if settings.USE_SSH_TUNNEL:
        ssh_tunnel_manager.start()
    try:
        asyncio.run(fix_and_migrate())
    finally:
        if settings.USE_SSH_TUNNEL:
            ssh_tunnel_manager.stop()
