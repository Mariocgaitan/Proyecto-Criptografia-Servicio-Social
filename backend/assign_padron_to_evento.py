"""
Asigna todos los alumnos del padrón que ya tienen cuenta (Usuario) al evento
indicado por --periodo (default: FEB_JUN) si aún no tienen asignación a ese evento.

Uso:
    uv run python assign_padron_to_evento.py                     # evento FEB_JUN activo
    uv run python assign_padron_to_evento.py --periodo AGO_DIC
    uv run python assign_padron_to_evento.py --id-evento 3
"""
import argparse
import asyncio
import traceback

from sqlalchemy import select

from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.models.evento import Evento
from app.models.padron_alumno import PadronAlumno
from app.models.usuario import Usuario
from app.models.usuario_evento import UsuarioEvento


async def run(periodo: str | None, id_evento: int | None) -> None:
    async with AsyncSessionLocal() as db:
        # Resolver evento objetivo
        if id_evento:
            ev_res = await db.execute(select(Evento).where(Evento.id_evento == id_evento))
            evento = ev_res.scalar_one_or_none()
            if not evento:
                print(f"ERROR: No existe evento con id={id_evento}")
                return
        else:
            query = select(Evento).order_by(Evento.id_evento)
            if periodo:
                query = query.where(Evento.periodo == periodo)
            else:
                query = query.where(Evento.activo.is_(True))
            ev_res = await db.execute(query.limit(1))
            evento = ev_res.scalars().first()
            if not evento:
                filtro = f"periodo='{periodo}'" if periodo else "activo=True"
                print(f"ERROR: No se encontró evento con {filtro}")
                return

        print(f"Evento objetivo: [{evento.id_evento}] {evento.nombre} ({evento.periodo} {evento.anio})")

        # Matrícula de todos los alumnos en el padrón que tienen cuenta
        padron_res = await db.execute(select(PadronAlumno.id_matricula))
        padron_ids = {row[0] for row in padron_res.all()}

        usuarios_res = await db.execute(
            select(Usuario.id_matricula).where(
                Usuario.id_matricula.in_(padron_ids),
                Usuario.rol == "alumno",
            )
        )
        matriculas_con_cuenta = [row[0] for row in usuarios_res.all()]
        print(f"Alumnos del padrón con cuenta: {len(matriculas_con_cuenta)}")

        # Los que YA tienen asignación a este evento
        ya_res = await db.execute(
            select(UsuarioEvento.id_matricula).where(
                UsuarioEvento.id_matricula.in_(matriculas_con_cuenta),
                UsuarioEvento.id_evento == evento.id_evento,
            )
        )
        ya_asignados = {row[0] for row in ya_res.all()}

        pendientes = [m for m in matriculas_con_cuenta if m not in ya_asignados]
        print(f"Ya asignados: {len(ya_asignados)}  |  Por asignar: {len(pendientes)}")

        if not pendientes:
            print("Nada que hacer.")
            return

        for matricula in pendientes:
            db.add(UsuarioEvento(id_matricula=matricula, id_evento=evento.id_evento))

        await db.commit()
        print(f"OK: {len(pendientes)} alumno(s) asignados al evento [{evento.id_evento}].")


def main() -> None:
    parser = argparse.ArgumentParser(description="Bulk-assign padron students to an event")
    parser.add_argument("--periodo", default=None, help="Periodo del evento: FEB_JUN, AGO_DIC, INVIERNO, VERANO")
    parser.add_argument("--id-evento", type=int, default=None, help="ID directo del evento (sobreescribe --periodo)")
    args = parser.parse_args()

    if settings.USE_SSH_TUNNEL:
        from app.db.ssh_manager import ssh_tunnel_manager
        ssh_tunnel_manager.start()

    try:
        asyncio.run(run(periodo=args.periodo, id_evento=args.id_evento))
    except Exception:
        traceback.print_exc()
    finally:
        if settings.USE_SSH_TUNNEL:
            from app.db.ssh_manager import ssh_tunnel_manager
            ssh_tunnel_manager.stop()


if __name__ == "__main__":
    main()
