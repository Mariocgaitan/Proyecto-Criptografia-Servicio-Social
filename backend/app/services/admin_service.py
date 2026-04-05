"""
Servicio del módulo Admin — lógica de negocio para gestión de proyectos.
"""
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.pagination import paginate
from app.models.empresa import Empresa
from app.models.evento import Evento
from app.models.inscripcion import Inscripcion
from app.models.log_auditoria import LogAuditoria
from app.models.proyecto import Proyecto
from app.models.usuario import Usuario
from app.models.usuario_evento import UsuarioEvento


# ── Proyectos ─────────────────────────────────────────────────────────────────

async def listar_proyectos(db: AsyncSession, page: int = 1, page_size: int = 20) -> dict:
    """Devuelve proyectos con datos de empresa y evento, paginados."""
    base_query = (
        select(Proyecto, Empresa, Evento)
        .join(Empresa, Proyecto.id_empresa == Empresa.id_empresa)
        .join(Evento, Proyecto.id_evento == Evento.id_evento)
        .order_by(Evento.id_evento, Empresa.nombre_empresa)
    )

    result = await paginate(db, base_query, page, page_size)
    rows = result["data"]

    proyecto_ids = [p.id_proyecto for p, _, _ in rows]
    inscripciones_por_proyecto: dict[int, list[dict]] = {pid: [] for pid in proyecto_ids}

    if proyecto_ids:
        inscripciones_result = await db.execute(
            select(Inscripcion)
            .options(selectinload(Inscripcion.usuario))
            .where(Inscripcion.id_proyecto.in_(proyecto_ids))
            .order_by(Inscripcion.timestamp.desc())
        )
        for inscripcion in inscripciones_result.scalars().all():
            alumno = inscripcion.usuario
            if not alumno:
                continue
            inscripciones_por_proyecto.setdefault(inscripcion.id_proyecto, []).append(
                {
                    "id_inscripcion": str(inscripcion.id_inscripcion),
                    "matricula": alumno.id_matricula,
                    "nombre": alumno.nombre,
                    "correo": alumno.correo,
                    "carrera": alumno.carrera,
                    "semestre": alumno.semestre,
                    "fecha_inscripcion": inscripcion.timestamp.isoformat() if inscripcion.timestamp else None,
                }
            )

    result["data"] = [
        {
            "id_proyecto": p.id_proyecto,
            "nombre_proyecto": p.nombre_proyecto,
            "descripcion": p.descripcion,
            "empresa": e.nombre_empresa,
            "id_empresa": p.id_empresa,
            "evento": ev.nombre,
            "id_evento": p.id_evento,
            "capacidad_max": p.capacidad_max,
            "cupo_actual": p.cupo_actual,
            "cupos_disponibles": max(0, p.capacidad_max - p.cupo_actual),
            "ocupacion_porcentaje": round((p.cupo_actual / p.capacidad_max) * 100) if p.capacidad_max else 0,
            "evento_activo": ev.activo,
            "inscripciones_totales": len(inscripciones_por_proyecto.get(p.id_proyecto, [])),
            "alumnos_inscritos": inscripciones_por_proyecto.get(p.id_proyecto, []),
            "estado": (
                "LLENO" if p.cupo_actual >= p.capacidad_max
                else "CASI LLENO" if p.cupo_actual >= p.capacidad_max * 0.8
                else "DISPONIBLE"
            ),
        }
        for p, e, ev in rows
    ]

    return result


async def listar_empresas(db: AsyncSession) -> list[dict]:
    """Devuelve todas las empresas."""
    result = await db.execute(select(Empresa).order_by(Empresa.nombre_empresa))
    return [
        {"id_empresa": e.id_empresa, "nombre_empresa": e.nombre_empresa}
        for e in result.scalars().all()
    ]


async def listar_eventos(db: AsyncSession) -> list[dict]:
    """Devuelve todos los eventos."""
    result = await db.execute(select(Evento).order_by(Evento.id_evento))
    return [
        {
            "id_evento": ev.id_evento,
            "nombre": ev.nombre,
            "periodo": ev.periodo,
            "anio": ev.anio,
            "activo": ev.activo,
        }
        for ev in result.scalars().all()
    ]


async def crear_proyecto(db: AsyncSession, datos) -> dict:
    """
    Crea un nuevo proyecto para una empresa y evento.
    """
    from fastapi import HTTPException

    empresa = await db.get(Empresa, datos.id_empresa)
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    evento = await db.get(Evento, datos.id_evento)
    if not evento:
        raise HTTPException(status_code=404, detail="Evento no encontrado")

    # 1. Crear el proyecto
    proyecto = Proyecto(
        id_empresa=datos.id_empresa,
        id_evento=datos.id_evento,
        nombre_proyecto=datos.nombre_proyecto,
        descripcion=datos.descripcion,
        capacidad_max=datos.capacidad_max,
        cupo_actual=0,
    )
    db.add(proyecto)
    await db.flush()  # Obtener el id_proyecto antes del commit

    await db.commit()
    await db.refresh(proyecto)

    return {
        "id_proyecto": proyecto.id_proyecto,
        "nombre_proyecto": proyecto.nombre_proyecto,
        "empresa": empresa.nombre_empresa,
        "evento": evento.nombre,
        "capacidad_max": proyecto.capacidad_max,
        "cupo_actual": 0,
    }


async def ampliar_cupo(db: AsyncSession, id_proyecto: int, nueva_capacidad: int) -> dict:
    """Amplía la capacidad de un proyecto. Debe ser mayor al cupo actual."""
    from fastapi import HTTPException

    proyecto = await db.get(Proyecto, id_proyecto)
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    if nueva_capacidad <= proyecto.capacidad_max:
        raise HTTPException(
            status_code=400,
            detail=f"La nueva capacidad ({nueva_capacidad}) debe ser mayor a la actual ({proyecto.capacidad_max})"
        )

    proyecto.capacidad_max = nueva_capacidad
    await db.commit()
    await db.refresh(proyecto)

    return {
        "id_proyecto": proyecto.id_proyecto,
        "nombre_proyecto": proyecto.nombre_proyecto,
        "capacidad_max": proyecto.capacidad_max,
        "cupo_actual": proyecto.cupo_actual,
    }


async def eliminar_inscripcion(
    db: AsyncSession,
    id_inscripcion: str,
    actor_matricula: str | None = None,
    ip_origen: str | None = None,
) -> dict:
    """Elimina una inscripción y ajusta el cupo del proyecto asociado."""
    from fastapi import HTTPException

    try:
        inscripcion_uuid = uuid.UUID(str(id_inscripcion))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="id_inscripcion inválido") from exc

    result = await db.execute(
        select(Inscripcion)
        .options(
            selectinload(Inscripcion.usuario),
            selectinload(Inscripcion.proyecto).selectinload(Proyecto.empresa)
        )
        .where(Inscripcion.id_inscripcion == inscripcion_uuid)
    )
    inscripcion = result.scalar_one_or_none()
    if not inscripcion:
        raise HTTPException(status_code=404, detail="Inscripción no encontrada")

    proyecto = inscripcion.proyecto
    alumno = inscripcion.usuario

    if proyecto and proyecto.cupo_actual > 0:
        proyecto.cupo_actual -= 1

    db.add(
        LogAuditoria(
            tipo_evento="INSCRIPCION_ELIMINADA_ADMIN",
            id_matricula=actor_matricula,
            ip_origen=ip_origen,
            detalle=(
                f"Admin eliminó inscripción {inscripcion.id_inscripcion} de "
                f"{alumno.id_matricula if alumno else 'N/A'} "
                f"en proyecto {proyecto.id_proyecto if proyecto else 'N/A'}"
            ),
        )
    )

    await db.delete(inscripcion)
    await db.commit()

    return {
        "ok": True,
        "mensaje": "Inscripción eliminada correctamente",
        "id_proyecto": proyecto.id_proyecto if proyecto else None,
        "cupo_actual": proyecto.cupo_actual if proyecto else None,
        "nombre_alumno": alumno.nombre if alumno else None,
        "correo_alumno": alumno.correo if alumno else None,
        "nombre_proyecto": proyecto.nombre_proyecto if proyecto else None,
        "nombre_empresa": (proyecto.empresa.nombre_empresa if proyecto and proyecto.empresa else None)
    }


async def listar_alumnos_disponibles(db: AsyncSession, id_evento: int) -> list[dict]:
    """
    Retorna los alumnos registrados en un evento que no están inscritos en ningún proyecto.
    """
    # 1. Obtener todos los alumnos registrados en el evento
    result = await db.execute(
        select(Usuario)
        .join(UsuarioEvento, Usuario.id_matricula == UsuarioEvento.id_matricula)
        .where(UsuarioEvento.id_evento == id_evento)
        .order_by(Usuario.nombre)
    )
    alumnos = result.scalars().all()

    # 2. Obtener todos los alumnos inscritos en proyectos de este evento
    ins_result = await db.execute(
        select(Inscripcion.id_matricula.distinct()).where(
            Inscripcion.id_evento == id_evento
        )
    )
    inscritos = {row[0] for row in ins_result.all()}

    # 3. Retornar solo los que no están inscritos
    return [
        {
            "id_matricula": a.id_matricula,
            "nombre": a.nombre,
            "carrera": a.carrera,
            "semestre": a.semestre,
            "correo": a.correo,
        }
        for a in alumnos
        if a.id_matricula not in inscritos
    ]


async def crear_inscripcion(
    db: AsyncSession,
    id_matricula: str,
    id_proyecto: int,
    actor_matricula: str | None = None,
    ip_origen: str | None = None,
) -> dict:
    """
    Crea una nueva inscripción de alumno en un proyecto.
    Valida que el alumno existe, está registrado en el evento y tiene cupo disponible.
    """
    from fastapi import HTTPException

    # 1. Verificar que el alumno existe
    result = await db.execute(
        select(Usuario).where(Usuario.id_matricula == id_matricula)
    )
    alumno = result.scalar_one_or_none()
    if not alumno:
        raise HTTPException(status_code=404, detail=f"Alumno {id_matricula} no encontrado")

    # 2. Verificar que el proyecto existe
    result = await db.execute(
        select(Proyecto)
        .options(selectinload(Proyecto.empresa), selectinload(Proyecto.evento))
        .where(Proyecto.id_proyecto == id_proyecto)
    )
    proyecto = result.scalar_one_or_none()
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    # 3. Verificar que el alumno está registrado en el evento
    ue_result = await db.execute(
        select(UsuarioEvento).where(
            UsuarioEvento.id_matricula == id_matricula,
            UsuarioEvento.id_evento == proyecto.id_evento,
        )
    )
    if not ue_result.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail=f"El alumno {id_matricula} no está registrado en el evento",
        )

    # 4. Verificar que no está ya inscrito en otro proyecto del mismo evento
    ins_result = await db.execute(
        select(Inscripcion).where(
            Inscripcion.id_matricula == id_matricula,
            Inscripcion.id_evento == proyecto.id_evento,
        )
    )
    if ins_result.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail=f"El alumno ya está inscrito en un proyecto de este evento",
        )

    # 5. Verificar que el proyecto tiene cupo disponible
    if proyecto.cupo_actual >= proyecto.capacidad_max:
        raise HTTPException(
            status_code=400,
            detail="El proyecto está lleno. No hay cupo disponible",
        )

    # 6. Crear la inscripción
    inscripcion = Inscripcion(
        id_inscripcion=uuid.uuid4(),
        id_matricula=id_matricula,
        id_proyecto=id_proyecto,
        id_evento=proyecto.id_evento,
    )
    proyecto.cupo_actual += 1
    db.add(inscripcion)

    # 7. Registrar en auditoría
    db.add(
        LogAuditoria(
            tipo_evento="INSCRIPCION_CREADA_ADMIN",
            id_matricula=actor_matricula,
            ip_origen=ip_origen,
            detalle=(
                f"Admin agregó inscripción de {id_matricula} ({alumno.nombre}) "
                f"al proyecto {proyecto.id_proyecto} ({proyecto.nombre_proyecto})"
            ),
        )
    )

    await db.commit()
    await db.refresh(proyecto)

    return {
        "ok": True,
        "mensaje": f"{alumno.nombre} ha sido inscrito exitosamente",
        "id_inscripcion": str(inscripcion.id_inscripcion),
        "id_proyecto": proyecto.id_proyecto,
        "nombre_alumno": alumno.nombre,
        "cupo_actual": proyecto.cupo_actual,
        "capacidad_max": proyecto.capacidad_max,
        "correo_alumno": alumno.correo,
        "nombre_proyecto": proyecto.nombre_proyecto,
        "nombre_empresa": proyecto.empresa.nombre_empresa if proyecto.empresa else None,
    }
