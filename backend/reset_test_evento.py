"""
Resetea el estado del evento 2 para pruebas end-to-end.
Uso: uv run python reset_test_evento.py
"""
import asyncio
from dotenv import load_dotenv
load_dotenv()


async def reset():
    from app.core.config import settings
    from sqlalchemy.ext.asyncio import create_async_engine
    from sqlalchemy import text

    engine = create_async_engine(str(settings.DATABASE_URL))
    async with engine.begin() as conn:
        r1 = await conn.execute(text("DELETE FROM inscripciones WHERE id_evento=2"))
        r2 = await conn.execute(text("DELETE FROM usuario_eventos WHERE id_evento=2"))
        await conn.execute(text(
            "UPDATE eventos SET iniciado=false, preregistro_abierto=true, "
            "fecha_inicio_real=NULL WHERE id_evento=2"
        ))
        await conn.execute(text("UPDATE proyectos SET cupo_actual=0 WHERE id_evento=2"))
        print(f"Inscripciones borradas:  {r1.rowcount}")
        print(f"usuario_eventos borradas: {r2.rowcount}")
        print("Evento: iniciado=false, preregistro_abierto=true, cupo_actual=0")
        print("Listo para nueva prueba.")
    await engine.dispose()


asyncio.run(reset())
