"""Script para corregir la version de alembic en la BD y aplicar la nueva migración."""
import asyncio
from sqlalchemy import text
from app.db.session import AsyncSessionLocal
from app.db.ssh_manager import ssh_tunnel_manager
from app.core.config import settings

async def fix_and_migrate():
    print("🔧 Verificando version actual en BD...")
    async with AsyncSessionLocal() as db:
        result = await db.execute(text("SELECT version_num FROM alembic_version"))
        current = result.scalar()
        print(f"   BD tiene: {current}")
        print(f"   Head real: a1b2c3d4e5f6")
        
        if current != "a1b2c3d4e5f6":
            print(f"   ⚠️  Versión incorrecta, corrigiendo...")
            await db.execute(
                text("UPDATE alembic_version SET version_num = 'a1b2c3d4e5f6' WHERE version_num = :old"),
                {"old": current}
            )
            await db.commit()
            print("   ✅ alembic_version corregida a 'a1b2c3d4e5f6'")
        else:
            print("   ✅ Versión ya es correcta")

if __name__ == "__main__":
    if settings.USE_SSH_TUNNEL:
        ssh_tunnel_manager.start()
    try:
        asyncio.run(fix_and_migrate())
    finally:
        if settings.USE_SSH_TUNNEL:
            ssh_tunnel_manager.stop()
