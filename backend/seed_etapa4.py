"""
Seed de datos de prueba — Etapa 4
Inserta empresas y proyectos de prueba para poder probar el escáner.

Ejecutar desde backend/ con el venv activo:
    python seed_etapa4.py

Es idempotente: usa ON CONFLICT DO NOTHING (no duplica si ya existen).
"""
import asyncio

from app.db.models_import import Base  # noqa
from app.db.session import AsyncSessionLocal
from app.models.empresa import Empresa
from app.models.evento import Evento
from app.models.proyecto import Proyecto
from sqlalchemy import select


EMPRESAS = [
    {"nombre_empresa": "CEMEX",        "logo_url": None},
    {"nombre_empresa": "Banorte",      "logo_url": None},
    {"nombre_empresa": "Tec Ventures", "logo_url": None},
]


async def seed_empresas_proyectos():
    async with AsyncSessionLocal() as db:
        # ── Verificar evento activo ──────────────────────────────────────
        result = await db.execute(select(Evento).where(Evento.activo == True))
        evento = result.scalar_one_or_none()

        if not evento:
            print("❌ No hay ningún evento activo en la DB.")
            print("   Asegúrate de haber corrido seed.py primero.")
            return

        print(f"✅ Evento activo encontrado: [{evento.id_evento}] {evento.nombre}")

        # ── Verificar si ya hay datos ────────────────────────────────────
        result = await db.execute(select(Empresa))
        existentes = result.scalars().all()

        if existentes:
            print(f"ℹ️  Ya existen {len(existentes)} empresas en la DB:")
            for e in existentes:
                print(f"   - [{e.id_empresa}] {e.nombre_empresa}")
        else:
            # Insertar empresas
            nuevas_empresas = [Empresa(**data) for data in EMPRESAS]
            db.add_all(nuevas_empresas)
            await db.flush()  # genera los IDs antes del commit

            print(f"✅ {len(nuevas_empresas)} empresas insertadas:")
            for e in nuevas_empresas:
                print(f"   - [{e.id_empresa}] {e.nombre_empresa}")

            # Insertar proyectos (uno por empresa)
            proyectos_data = [
                {
                    "id_empresa":            nuevas_empresas[0].id_empresa,
                    "id_evento":             evento.id_evento,
                    "nombre_proyecto":       "App de Logística",
                    "descripcion":           "Desarrollo de app móvil para gestión de rutas.",
                    "capacidad_max":         3,
                    "cupo_actual":           0,
                    "capacidad_espera_max":  2,
                },
                {
                    "id_empresa":            nuevas_empresas[1].id_empresa,
                    "id_evento":             evento.id_evento,
                    "nombre_proyecto":       "Dashboard Financiero",
                    "descripcion":           "Visualización de datos financieros en tiempo real.",
                    "capacidad_max":         3,
                    "cupo_actual":           0,
                    "capacidad_espera_max":  2,
                },
                {
                    "id_empresa":            nuevas_empresas[2].id_empresa,
                    "id_evento":             evento.id_evento,
                    "nombre_proyecto":       "Plataforma de Startups",
                    "descripcion":           "Portal para conectar emprendedores con inversores.",
                    "capacidad_max":         3,
                    "cupo_actual":           0,
                    "capacidad_espera_max":  2,
                },
            ]

            nuevos_proyectos = [Proyecto(**data) for data in proyectos_data]
            db.add_all(nuevos_proyectos)
            await db.commit()

            print(f"\n✅ {len(nuevos_proyectos)} proyectos insertados:")
            for p in nuevos_proyectos:
                print(f"   - [{p.id_proyecto}] {p.nombre_proyecto} | cupo {p.cupo_actual}/{p.capacidad_max}")

        # ── Mostrar estado final ─────────────────────────────────────────
        result = await db.execute(select(Proyecto))
        todos = result.scalars().all()
        print(f"\n📋 Proyectos en la DB ({len(todos)} total):")
        for p in todos:
            print(f"   ID {p.id_proyecto} → {p.nombre_proyecto} | cupo {p.cupo_actual}/{p.capacidad_max}")


async def main():
    print("🌱 Insertando datos de prueba para Etapa 4...\n")
    await seed_empresas_proyectos()
    print("\n✅ Listo.")


if __name__ == "__main__":
    from app.core.config import settings
    from app.db.ssh_manager import ssh_tunnel_manager

    if settings.USE_SSH_TUNNEL:
        ssh_tunnel_manager.start()

    try:
        asyncio.run(main())
    finally:
        if settings.USE_SSH_TUNNEL:
            ssh_tunnel_manager.stop()
