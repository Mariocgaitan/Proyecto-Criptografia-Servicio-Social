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
from app.models.padron_alumno import PadronAlumno
from sqlalchemy import select


EVENTOS_INICIALES = [
    {"nombre": "Invierno 2026",          "periodo": "INVIERNO", "anio": 2026, "activo": False},
    {"nombre": "Febrero-Junio 2026",     "periodo": "FEB_JUN",  "anio": 2026, "activo": True},
    {"nombre": "Verano 2026",            "periodo": "VERANO",   "anio": 2026, "activo": False},
    {"nombre": "Agosto-Diciembre 2026",  "periodo": "AGO_DIC",  "anio": 2026, "activo": False},
]


PADRON_INICIAL = [
    {"id_matricula": "A03459128", "nombre_completo": "Juan Perez Garcia"},
    {"id_matricula": "A01659147", "nombre_completo": "Luis Alan Morales Castillo"},
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


async def seed_padron():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(PadronAlumno))
        existentes = result.scalars().all()

        if existentes:
            print(f"ℹ️  Ya existen {len(existentes)} alumnos en el padrón. No se insertaron duplicados.")
            return

        alumnos = [PadronAlumno(**data) for data in PADRON_INICIAL]
        db.add_all(alumnos)
        await db.commit()
        print(f"✅ {len(alumnos)} alumnos insertados en el padrón correctamente.")


async def main():
    print("🌱 Ejecutando seed de datos iniciales...")
    await seed_eventos()
    await seed_padron()
    print("✅ Seed completado.")


if __name__ == "__main__":
    asyncio.run(main())
