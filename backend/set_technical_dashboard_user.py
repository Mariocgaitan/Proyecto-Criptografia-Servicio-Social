"""Crea o actualiza un usuario compartido para acceso al dashboard tecnico.

Uso:
  1) Activa el entorno de backend.
  2) Ejecuta: python set_technical_dashboard_user.py
"""

from __future__ import annotations

import asyncio
import os

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import AsyncSessionLocal
from app.models.usuario import Usuario

TECH_EMAIL = os.getenv("TECH_DASH_EMAIL", "dashboarddelospros@tec.mx").strip().lower()
TECH_PASSWORD = os.getenv("TECH_DASH_PASSWORD", "")
BASE_MATRICULA = "TEC-DASH-001"


async def _pick_available_matricula(db) -> str:
    existing = await db.scalar(select(Usuario).where(Usuario.id_matricula == BASE_MATRICULA))
    if existing is None:
        return BASE_MATRICULA

    suffix = 2
    while True:
        candidate = f"TEC-DASH-{suffix:03d}"
        exists = await db.scalar(select(Usuario).where(Usuario.id_matricula == candidate))
        if exists is None:
            return candidate
        suffix += 1


async def upsert_technical_user() -> None:
    if not TECH_PASSWORD:
        raise RuntimeError("Define TECH_DASH_PASSWORD antes de ejecutar el script.")

    async with AsyncSessionLocal() as db:
        user = await db.scalar(select(Usuario).where(Usuario.correo == TECH_EMAIL))

        if user is None:
            matricula = await _pick_available_matricula(db)
            user = Usuario(
                id_matricula=matricula,
                nombre="Dashboard Tecnico Compartido",
                correo=TECH_EMAIL,
                carrera="SISTEMAS",
                semestre=9,
                password_hash=hash_password(TECH_PASSWORD),
                is_google_login=False,
                totp_secret="",
                rol="admin",
            )
            db.add(user)
            await db.commit()
            print(f"Usuario tecnico creado: {TECH_EMAIL} (matricula: {matricula})")
            return

        user.password_hash = hash_password(TECH_PASSWORD)
        user.is_google_login = False
        user.rol = "admin"
        if not user.totp_secret:
            user.totp_secret = ""

        await db.commit()
        print(f"Usuario tecnico actualizado: {TECH_EMAIL}")


if __name__ == "__main__":
    asyncio.run(upsert_technical_user())
