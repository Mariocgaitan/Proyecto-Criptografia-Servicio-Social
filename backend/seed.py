"""
Script de seed — Inserta los datos iniciales necesarios para que el sistema funcione.

Ejecutar UNA SOLA VEZ después de aplicar las migraciones:
    uv run python seed.py

Si los eventos ya existen, el script los omite (es idempotente).
"""
import asyncio

from app.db.models_import import Base  # noqa: asegura que los modelos están registrados
from app.db.session import AsyncSessionLocal
from app.models.evento import Evento
from sqlalchemy import select


EVENTOS_INICIALES = [
    {"nombre": "Invierno 2026",          "periodo": "INVIERNO", "anio": 2026, "activo": False},
    {"nombre": "Febrero-Junio 2026",     "periodo": "FEB_JUN",  "anio": 2026, "activo": True},
    {"nombre": "Verano 2026",            "periodo": "VERANO",   "anio": 2026, "activo": False},
    {"nombre": "Agosto-Diciembre 2026",  "periodo": "AGO_DIC",  "anio": 2026, "activo": False},
]


async def seed_eventos():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Evento))
        existentes = result.scalars().all()

        if existentes:
            print(f"ℹ️  Ya existen {len(existentes)} eventos en la DB. No se insertaron duplicados.")
            for e in existentes:
                print(f"   - [{e.id_evento}] {e.nombre} ({'ACTIVO' if e.activo else 'inactivo'})")
            return

        eventos = [Evento(**data) for data in EVENTOS_INICIALES]
        db.add_all(eventos)
        await db.commit()
        print(f"✅ {len(eventos)} eventos insertados correctamente:")
        for e in eventos:
            print(f"   - {e.nombre} ({'ACTIVO' if e.activo else 'inactivo'})")


async def main():
    print("🌱 Ejecutando seed de datos iniciales...")
    await seed_eventos()
    print("✅ Seed completado.")


if __name__ == "__main__":
    asyncio.run(main())
