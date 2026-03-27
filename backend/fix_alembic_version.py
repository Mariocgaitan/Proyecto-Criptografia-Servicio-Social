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

        # Corrección de versión fantasma por compañero que no está sincronizada
        if "g0a1b2c3d4e5" in versions:
            print("   ⚠️  Encontrada revisión fantasma g0a1b2c3d4e5, corrigiendo a e1f2a3b4c5d6...")
            await db.execute(
                text(
                    """
                    UPDATE alembic_version
                    SET version_num = 'e1f2a3b4c5d6'
                    WHERE version_num = 'g0a1b2c3d4e5'
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
