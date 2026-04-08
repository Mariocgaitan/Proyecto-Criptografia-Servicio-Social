"""
Generate demo data for admin dashboard evaluation.

Goal:
- Ensure at least N registered students in active event (usuario_eventos)
- Ensure at least M inscriptions in active event (inscripciones)

Usage:
  python seed_admin_dashboard_dataset.py --target-registered 100 --target-inscriptions 38
"""

import argparse
import asyncio
import random
import uuid

import bcrypt
from sqlalchemy import desc, func, select

from app.db.session import AsyncSessionLocal
from app.models.evento import Evento
from app.models.inscripcion import Inscripcion
from app.models.padron_alumno import PadronAlumno
from app.models.proyecto import Proyecto
from app.models.usuario import Usuario
from app.models.usuario_evento import UsuarioEvento

DEFAULT_PASSWORD = "Seed1234!"
DEFAULT_TOTP_SECRET = "A" * 32
RANDOM_SEED = 20260407

CAREER_CODES = [
    "IBM", "ICV", "IAL", "IBA", "IBT", "IDS", "IES", "IFI", "IID", "IAD",
    "INM", "IRS", "ITC", "ITD", "IIS", "IME", "IMT", "IQU", "LCF", "LDT",
    "LEI", "LET", "LFI", "LIN", "LME", "LNI", "LCP", "LHD", "LIT", "LLE",
    "LTM", "ARQ", "LAD", "LDE", "LDI", "LEC", "LUR", "LGT", "LRI", "LBC",
    "LNB", "LPS", "MCI", "MCO",
]

FIRST_NAMES = [
    "Santiago", "Mateo", "Sebastian", "Diego", "Emiliano", "Camila", "Valentina", "Ximena", "Regina", "Natalia",
    "Andres", "Daniel", "Pablo", "Roberto", "Miguel", "Ana", "Fernanda", "Paula", "Sofia", "Lucia",
]

LAST_NAMES = [
    "Garcia", "Martinez", "Lopez", "Hernandez", "Gonzalez", "Perez", "Ramirez", "Torres", "Flores", "Rivera",
    "Sanchez", "Gomez", "Diaz", "Vargas", "Castro", "Ortega", "Rojas", "Navarro", "Reyes", "Campos",
]


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


async def _get_target_event_id() -> int:
    async with AsyncSessionLocal() as db:
        active_event = await db.scalar(
            select(Evento).where(Evento.activo.is_(True)).order_by(desc(Evento.id_evento)).limit(1)
        )
        if active_event is not None:
            return int(active_event.id_evento)

        latest_event = await db.scalar(select(Evento).order_by(desc(Evento.id_evento)).limit(1))
        if latest_event is None:
            raise RuntimeError("No events found. Run seed.py first.")

        return int(latest_event.id_evento)


async def _generate_missing_registrations(event_id: int, target_registered: int) -> int:
    rng = random.Random(RANDOM_SEED)
    hashed_pw = _hash_password(DEFAULT_PASSWORD)

    async with AsyncSessionLocal() as db:
        current_registered = int(
            await db.scalar(
                select(func.count(func.distinct(UsuarioEvento.id_matricula))).where(UsuarioEvento.id_evento == event_id)
            )
            or 0
        )

        missing = max(target_registered - current_registered, 0)
        if missing == 0:
            return 0

        existing_matriculas = set(
            (
                await db.execute(select(Usuario.id_matricula))
            ).scalars().all()
        )

        next_number = 50000000
        created = 0
        for index in range(missing):
            while True:
                matricula = f"A{next_number:08d}"
                next_number += 1
                if matricula not in existing_matriculas:
                    existing_matriculas.add(matricula)
                    break

            first = FIRST_NAMES[index % len(FIRST_NAMES)]
            last_a = LAST_NAMES[(index * 2) % len(LAST_NAMES)]
            last_b = LAST_NAMES[(index * 2 + 7) % len(LAST_NAMES)]
            full_name = f"{first} {last_a} {last_b}"
            carrera = CAREER_CODES[index % len(CAREER_CODES)]
            semestre = (index % 10) + 1
            correo = f"{matricula.lower()}@tec.mx"

            padron = PadronAlumno(
                id_matricula=matricula,
                nombre_completo=full_name,
                carrera=carrera,
                semestre=semestre,
            )
            usuario = Usuario(
                id_matricula=matricula,
                nombre=full_name,
                correo=correo,
                carrera=carrera,
                semestre=semestre,
                password_hash=hashed_pw,
                totp_secret=DEFAULT_TOTP_SECRET,
                rol="alumno",
            )
            usuario_evento = UsuarioEvento(
                id_matricula=matricula,
                id_evento=event_id,
            )

            db.add(padron)
            db.add(usuario)
            db.add(usuario_evento)
            created += 1

        # Shuffle a bit by touching random career assignment over a slice to avoid strict patterns.
        _ = rng.random()

        await db.commit()
        return created


async def _ensure_project_capacity(db, event_id: int, required_new_inscriptions: int, projects: list[Proyecto]) -> None:
    current_available = sum(max((p.capacidad_max or 0) - (p.cupo_actual or 0), 0) for p in projects)
    missing_capacity = max(required_new_inscriptions - current_available, 0)
    if missing_capacity == 0:
        return

    idx = 0
    while missing_capacity > 0 and projects:
        project = projects[idx % len(projects)]
        project.capacidad_max = int(project.capacidad_max or 0) + 1
        missing_capacity -= 1
        idx += 1


async def _generate_missing_inscriptions(event_id: int, target_inscriptions: int) -> int:
    async with AsyncSessionLocal() as db:
        current_inscriptions = int(
            await db.scalar(select(func.count(Inscripcion.id_inscripcion)).where(Inscripcion.id_evento == event_id)) or 0
        )

        missing = max(target_inscriptions - current_inscriptions, 0)
        if missing == 0:
            return 0

        projects = (
            await db.execute(
                select(Proyecto)
                .where(Proyecto.id_evento == event_id)
                .order_by(Proyecto.id_proyecto.asc())
            )
        ).scalars().all()

        if not projects:
            raise RuntimeError("No projects found for active event. Run seed.py first.")

        await _ensure_project_capacity(db, event_id, missing, projects)

        registered_ids = set(
            (
                await db.execute(select(UsuarioEvento.id_matricula).where(UsuarioEvento.id_evento == event_id))
            ).scalars().all()
        )
        already_inscribed_ids = set(
            (
                await db.execute(select(Inscripcion.id_matricula).where(Inscripcion.id_evento == event_id))
            ).scalars().all()
        )

        candidates = sorted(registered_ids - already_inscribed_ids)
        if len(candidates) < missing:
            raise RuntimeError(
                f"Not enough registered candidates without inscription. Missing {missing}, available {len(candidates)}"
            )

        created = 0
        candidate_index = 0
        while created < missing:
            assigned = False
            for project in projects:
                available = max((project.capacidad_max or 0) - (project.cupo_actual or 0), 0)
                if available <= 0:
                    continue

                matricula = candidates[candidate_index]
                candidate_index += 1

                inscripcion = Inscripcion(
                    id_inscripcion=uuid.uuid4(),
                    id_matricula=matricula,
                    id_proyecto=project.id_proyecto,
                    id_evento=event_id,
                )
                project.cupo_actual = int(project.cupo_actual or 0) + 1
                db.add(inscripcion)

                created += 1
                assigned = True
                if created >= missing:
                    break

            if not assigned:
                # Safety: increase capacity by one on first project and continue.
                projects[0].capacidad_max = int(projects[0].capacidad_max or 0) + 1

        await db.commit()
        return created


async def main(target_registered: int, target_inscriptions: int) -> None:
    event_id = await _get_target_event_id()

    created_registered = await _generate_missing_registrations(event_id, target_registered)
    created_inscriptions = await _generate_missing_inscriptions(event_id, target_inscriptions)

    async with AsyncSessionLocal() as db:
        total_registered = int(
            await db.scalar(
                select(func.count(func.distinct(UsuarioEvento.id_matricula))).where(UsuarioEvento.id_evento == event_id)
            )
            or 0
        )
        total_inscriptions = int(
            await db.scalar(select(func.count(Inscripcion.id_inscripcion)).where(Inscripcion.id_evento == event_id)) or 0
        )

    print("\nAdmin dashboard dataset complete")
    print(f"- Event id: {event_id}")
    print(f"- New registrations created: {created_registered}")
    print(f"- New inscriptions created: {created_inscriptions}")
    print(f"- Total registrations in event: {total_registered}")
    print(f"- Total inscriptions in event: {total_inscriptions}")
    print(f"- Default password for new students: {DEFAULT_PASSWORD}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed demo data for admin dashboard")
    parser.add_argument("--target-registered", type=int, default=100)
    parser.add_argument("--target-inscriptions", type=int, default=38)
    args = parser.parse_args()

    asyncio.run(main(args.target_registered, args.target_inscriptions))
