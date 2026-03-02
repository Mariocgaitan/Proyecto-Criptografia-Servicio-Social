import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from app.core.config import settings
from app.db.ssh_manager import ssh_tunnel_manager

async def test_connection():
    print("🔍 Iniciando prueba de conexión...")
    print(f"Configuración: USE_SSH_TUNNEL={settings.USE_SSH_TUNNEL}")
    
    if settings.USE_SSH_TUNNEL:
        try:
            print("🔗 Iniciando túnel SSH...")
            ssh_tunnel_manager.start()
        except Exception as e:
            print(f"❌ Error al iniciar el túnel: {e}")
            return

    try:
        print(f"🛢️ Probando conexión a la DB: {settings.DATABASE_URL}")
        engine = create_async_engine(settings.DATABASE_URL)
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT version();"))
            version = result.scalar()
            print(f"✅ Conexión exitosa! Versión de PostgreSQL: {version}")
    except Exception as e:
        print(f"❌ Error de conexión a la DB: {e}")
    finally:
        if settings.USE_SSH_TUNNEL:
            print("🛑 Cerrando túnel SSH...")
            ssh_tunnel_manager.stop()
            print("🛑 Túnel SSH cerrado")

if __name__ == "__main__":
    asyncio.run(test_connection())
