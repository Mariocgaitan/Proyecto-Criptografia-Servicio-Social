"""
Limpieza de datos de prueba — Etapa 4
Borra inscripciones, lista de espera, proyectos y empresas de prueba.

Ejecutar desde backend/ con el venv activo:
    python cleanup_etapa4.py
"""
import asyncio

from app.db.models_import import Base  # noqa
from app.db.session import AsyncSessionLocal
from app.models.inscripcion import Inscripcion
from app.models.lista_espera import ListaEspera
from app.models.proyecto import Proyecto
from app.models.empresa import Empresa
from sqlalchemy import delete, update


async def limpiar():
    async with AsyncSessionLocal() as db:
        r1 = await db.execute(delete(Inscripcion))
        print(f"🗑️  Inscripciones eliminadas: {r1.rowcount}")

        r2 = await db.execute(delete(ListaEspera))
        print(f"🗑️  Lista de espera eliminada: {r2.rowcount}")

        r3 = await db.execute(update(Proyecto).values(cupo_actual=0))
        print(f"🔄 Cupo_actual reseteado en {r3.rowcount} proyectos")

        r4 = await db.execute(delete(Proyecto))
        print(f"🗑️  Proyectos eliminados: {r4.rowcount}")

        r5 = await db.execute(delete(Empresa))
        print(f"🗑️  Empresas eliminadas: {r5.rowcount}")

        await db.commit()
        print("\n✅ Limpieza completada.")


if __name__ == "__main__":
    from app.core.config import settings
    from app.db.ssh_manager import ssh_tunnel_manager

    if settings.USE_SSH_TUNNEL:
        ssh_tunnel_manager.start()

    try:
        asyncio.run(limpiar())
    finally:
        if settings.USE_SSH_TUNNEL:
            ssh_tunnel_manager.stop()
