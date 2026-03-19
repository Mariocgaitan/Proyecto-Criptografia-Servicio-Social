from __future__ import annotations

from collections import defaultdict
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import and_, desc, distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.empresa import Empresa
from app.models.evento import Evento
from app.models.inscripcion import Inscripcion
from app.models.lista_espera import ListaEspera
from app.models.log_auditoria import LogAuditoria
from app.models.proyecto import Proyecto
from app.models.usuario import Usuario
from app.models.usuario_evento import UsuarioEvento


def _normalize_date_range(fecha_inicio: date | None, fecha_fin: date | None) -> tuple[datetime | None, datetime | None]:
    start_dt = datetime.combine(fecha_inicio, datetime.min.time(), tzinfo=UTC) if fecha_inicio else None
    end_dt = datetime.combine(fecha_fin, datetime.max.time(), tzinfo=UTC) if fecha_fin else None
    return start_dt, end_dt


async def _resolve_evento_id(db: AsyncSession, evento_id: int | None) -> int | None:
    if evento_id is not None:
        exists = await db.scalar(select(Evento.id_evento).where(Evento.id_evento == evento_id))
        return exists

    # Prioriza evento activo; si no hay, toma el más reciente.
    active = await db.scalar(
        select(Evento.id_evento).where(Evento.activo.is_(True)).order_by(desc(Evento.id_evento)).limit(1)
    )
    if active is not None:
        return active

    return await db.scalar(select(Evento.id_evento).order_by(desc(Evento.id_evento)).limit(1))


async def get_kpis(
    db: AsyncSession,
    evento_id: int | None = None,
    fecha_inicio: date | None = None,
    fecha_fin: date | None = None,
) -> dict:
    selected_evento_id = await _resolve_evento_id(db, evento_id)
    start_dt, end_dt = _normalize_date_range(fecha_inicio, fecha_fin)

    total_registrados = 0
    total_inscritos = 0
    total_espera = 0
    total_empresas = 0
    ocupacion_promedio = 0.0

    if selected_evento_id is not None:
        total_registrados = int(
            await db.scalar(
                select(func.count(distinct(UsuarioEvento.id_matricula))).where(
                    UsuarioEvento.id_evento == selected_evento_id
                )
            )
            or 0
        )

        ins_filters = [Inscripcion.id_evento == selected_evento_id]
        espera_filters = [ListaEspera.id_evento == selected_evento_id]
        if start_dt is not None:
            ins_filters.append(Inscripcion.timestamp >= start_dt)
            espera_filters.append(ListaEspera.timestamp_registro >= start_dt)
        if end_dt is not None:
            ins_filters.append(Inscripcion.timestamp <= end_dt)
            espera_filters.append(ListaEspera.timestamp_registro <= end_dt)

        total_inscritos = int(await db.scalar(select(func.count(Inscripcion.id_inscripcion)).where(and_(*ins_filters))) or 0)
        total_espera = int(await db.scalar(select(func.count(ListaEspera.id_espera)).where(and_(*espera_filters))) or 0)

        total_empresas = int(
            await db.scalar(
                select(func.count(distinct(Proyecto.id_empresa))).where(Proyecto.id_evento == selected_evento_id)
            )
            or 0
        )

        sum_capacidad, sum_cupo = (
            await db.execute(
                select(
                    func.coalesce(func.sum(Proyecto.capacidad_max), 0),
                    func.coalesce(func.sum(Proyecto.cupo_actual), 0),
                ).where(Proyecto.id_evento == selected_evento_id)
            )
        ).one()
        ocupacion_promedio = round((float(sum_cupo) / float(sum_capacidad)) * 100, 2) if sum_capacidad else 0.0

    login_fallidos_7d = int(
        await db.scalar(
            select(func.count(LogAuditoria.id_log)).where(
                LogAuditoria.tipo_evento == "LOGIN_FALLIDO",
                LogAuditoria.timestamp >= (datetime.now(UTC) - timedelta(days=7)),
            )
        )
        or 0
    )

    return {
        "evento_id": selected_evento_id,
        "total_alumnos_registrados": total_registrados,
        "total_inscritos": total_inscritos,
        "ocupacion_promedio": ocupacion_promedio,
        "en_lista_espera": total_espera,
        "empresas_participantes": total_empresas,
        "intentos_login_fallido_7d": login_fallidos_7d,
    }


async def get_ocupacion_eventos(db: AsyncSession, evento_id: int | None = None) -> list[dict]:
    filters = [Evento.id_evento == evento_id] if evento_id else []
    rows = (
        await db.execute(
            select(
                Evento.id_evento,
                Evento.nombre,
                Evento.periodo,
                Evento.anio,
                func.coalesce(func.sum(Proyecto.capacidad_max), 0).label("capacidad_total"),
                func.coalesce(func.sum(Proyecto.cupo_actual), 0).label("inscritos_total"),
            )
            .outerjoin(Proyecto, Proyecto.id_evento == Evento.id_evento)
            .where(*filters)
            .group_by(Evento.id_evento, Evento.nombre, Evento.periodo, Evento.anio)
            .order_by(Evento.anio.desc(), Evento.id_evento.desc())
        )
    ).all()

    output = []
    for row in rows:
        capacidad = int(row.capacidad_total or 0)
        inscritos = int(row.inscritos_total or 0)
        porcentaje = round((inscritos / capacidad) * 100, 2) if capacidad else 0.0
        output.append(
            {
                "id_evento": row.id_evento,
                "evento": row.nombre,
                "periodo": row.periodo,
                "anio": row.anio,
                "capacidad": capacidad,
                "inscritos": inscritos,
                "porcentaje": porcentaje,
            }
        )

    return output


async def get_proyectos_cupo(
    db: AsyncSession,
    evento_id: int | None = None,
    empresa_id: int | None = None,
) -> list[dict]:
    filters = []
    if evento_id is not None:
        filters.append(Proyecto.id_evento == evento_id)
    if empresa_id is not None:
        filters.append(Proyecto.id_empresa == empresa_id)

    rows = (
        await db.execute(
            select(
                Proyecto.id_proyecto,
                Proyecto.nombre_proyecto,
                Proyecto.id_evento,
                Proyecto.capacidad_max,
                Proyecto.cupo_actual,
                Proyecto.capacidad_espera_max,
                Empresa.id_empresa,
                Empresa.nombre_empresa,
                func.coalesce(func.count(ListaEspera.id_espera), 0).label("espera_count"),
            )
            .join(Empresa, Empresa.id_empresa == Proyecto.id_empresa)
            .outerjoin(ListaEspera, ListaEspera.id_proyecto == Proyecto.id_proyecto)
            .where(*filters)
            .group_by(
                Proyecto.id_proyecto,
                Proyecto.nombre_proyecto,
                Proyecto.id_evento,
                Proyecto.capacidad_max,
                Proyecto.cupo_actual,
                Proyecto.capacidad_espera_max,
                Empresa.id_empresa,
                Empresa.nombre_empresa,
            )
            .order_by(Empresa.nombre_empresa.asc(), Proyecto.nombre_proyecto.asc())
        )
    ).all()

    return [
        {
            "id_proyecto": row.id_proyecto,
            "proyecto": row.nombre_proyecto,
            "id_evento": row.id_evento,
            "id_empresa": row.id_empresa,
            "empresa": row.nombre_empresa,
            "capacidad_max": int(row.capacidad_max or 0),
            "cupo_actual": int(row.cupo_actual or 0),
            "espera_count": int(row.espera_count or 0),
            "capacidad_espera_max": int(row.capacidad_espera_max or 0),
        }
        for row in rows
    ]


async def get_alumnos_por_empresa(db: AsyncSession, evento_id: int | None = None) -> list[dict]:
    filters = [Inscripcion.id_evento == evento_id] if evento_id is not None else []

    rows = (
        await db.execute(
            select(
                Empresa.id_empresa,
                Empresa.nombre_empresa,
                func.count(Inscripcion.id_inscripcion).label("cantidad"),
            )
            .join(Proyecto, Proyecto.id_empresa == Empresa.id_empresa)
            .join(Inscripcion, Inscripcion.id_proyecto == Proyecto.id_proyecto)
            .where(*filters)
            .group_by(Empresa.id_empresa, Empresa.nombre_empresa)
            .order_by(desc("cantidad"), Empresa.nombre_empresa.asc())
        )
    ).all()

    return [
        {
            "id_empresa": row.id_empresa,
            "empresa": row.nombre_empresa,
            "cantidad_inscritos": int(row.cantidad or 0),
        }
        for row in rows
    ]


async def get_alumnos_por_carrera(
    db: AsyncSession,
    evento_id: int | None = None,
    carrera: str | None = None,
) -> list[dict]:
    filters = []
    if evento_id is not None:
        filters.append(Inscripcion.id_evento == evento_id)
    if carrera is not None:
        filters.append(Usuario.carrera == carrera)

    rows = (
        await db.execute(
            select(
                Usuario.carrera,
                Usuario.semestre,
                func.count(Inscripcion.id_inscripcion).label("cantidad"),
            )
            .join(Inscripcion, Inscripcion.id_matricula == Usuario.id_matricula)
            .where(*filters)
            .group_by(Usuario.carrera, Usuario.semestre)
            .order_by(Usuario.carrera.asc(), Usuario.semestre.asc())
        )
    ).all()

    carrera_map: dict[str, dict] = {}
    for row in rows:
        if row.carrera not in carrera_map:
            carrera_map[row.carrera] = {
                "carrera": row.carrera,
                "cantidad": 0,
                "por_semestre": [],
            }

        carrera_map[row.carrera]["cantidad"] += int(row.cantidad or 0)
        carrera_map[row.carrera]["por_semestre"].append(
            {
                "semestre": int(row.semestre or 0),
                "cantidad": int(row.cantidad or 0),
            }
        )

    return sorted(carrera_map.values(), key=lambda item: item["cantidad"], reverse=True)


async def get_tendencia_espera(
    db: AsyncSession,
    evento_id: int | None = None,
    dias: int = 13,
) -> list[dict]:
    dias = max(3, min(dias, 60))
    start_day = datetime.now(UTC).date() - timedelta(days=dias - 1)

    ins_filters = [func.date(Inscripcion.timestamp) >= start_day]
    espera_filters = [func.date(ListaEspera.timestamp_registro) >= start_day]
    if evento_id is not None:
        ins_filters.append(Inscripcion.id_evento == evento_id)
        espera_filters.append(ListaEspera.id_evento == evento_id)

    ins_rows = (
        await db.execute(
            select(
                func.date(Inscripcion.timestamp).label("fecha"),
                func.count(Inscripcion.id_inscripcion).label("cantidad"),
            )
            .where(*ins_filters)
            .group_by(func.date(Inscripcion.timestamp))
            .order_by(func.date(Inscripcion.timestamp).asc())
        )
    ).all()
    espera_rows = (
        await db.execute(
            select(
                func.date(ListaEspera.timestamp_registro).label("fecha"),
                func.count(ListaEspera.id_espera).label("cantidad"),
            )
            .where(*espera_filters)
            .group_by(func.date(ListaEspera.timestamp_registro))
            .order_by(func.date(ListaEspera.timestamp_registro).asc())
        )
    ).all()

    ins_map = {row.fecha: int(row.cantidad or 0) for row in ins_rows}
    espera_map = {row.fecha: int(row.cantidad or 0) for row in espera_rows}

    response = []
    acumulado_ins = 0
    acumulado_espera = 0
    for i in range(dias):
        day = start_day + timedelta(days=i)
        acumulado_ins += ins_map.get(day, 0)
        acumulado_espera += espera_map.get(day, 0)
        response.append(
            {
                "fecha": day.isoformat(),
                "inscritos_dia": ins_map.get(day, 0),
                "espera_dia": espera_map.get(day, 0),
                "inscritos_acum": acumulado_ins,
                "espera_acum": acumulado_espera,
            }
        )

    return response


async def get_inscripciones_timeline(
    db: AsyncSession,
    evento_id: int | None = None,
    horas: int = 48,
) -> list[dict]:
    horas = max(12, min(horas, 168))
    now = datetime.now(UTC).replace(minute=0, second=0, microsecond=0)
    start_dt = now - timedelta(hours=horas)

    filters = [Inscripcion.timestamp >= start_dt]
    if evento_id is not None:
        filters.append(Inscripcion.id_evento == evento_id)

    rows = (
        await db.execute(
            select(Inscripcion.timestamp)
            .where(*filters)
            .order_by(Inscripcion.timestamp.asc())
        )
    ).scalars().all()

    # Agrupación en buckets de 2 horas para evitar ruido visual.
    bucket_counts: dict[datetime, int] = defaultdict(int)
    for ts in rows:
        if ts is None:
            continue
        ts_utc = ts.astimezone(UTC)
        hour = ts_utc.replace(minute=0, second=0, microsecond=0)
        bucket_hour = hour - timedelta(hours=hour.hour % 2)
        bucket_counts[bucket_hour] += 1

    response = []
    acumulado = 0
    cursor = start_dt
    while cursor <= now:
        bucket_start = cursor - timedelta(hours=cursor.hour % 2)
        cantidad = bucket_counts.get(bucket_start, 0)
        acumulado += cantidad
        response.append(
            {
                "timestamp": bucket_start.isoformat(),
                "cantidad_nueva": cantidad,
                "acumulado": acumulado,
            }
        )
        cursor += timedelta(hours=2)

    dedup: dict[str, dict] = {}
    for item in response:
        dedup[item["timestamp"]] = item

    return [dedup[key] for key in sorted(dedup.keys())]

async def get_reinscripcion_scatter(db: AsyncSession, evento_id: int | None = None) -> list[dict]:
    # Total eventos en los que el alumno se ha registrado.
    ev_rows = (
        await db.execute(
            select(
                UsuarioEvento.id_matricula,
                func.count(distinct(UsuarioEvento.id_evento)).label("eventos_registrado"),
            )
            .group_by(UsuarioEvento.id_matricula)
        )
    ).all()

    # Total inscripciones históricas del alumno.
    ins_rows = (
        await db.execute(
            select(
                Inscripcion.id_matricula,
                func.count(Inscripcion.id_inscripcion).label("proyectos_inscrito"),
            )
            .group_by(Inscripcion.id_matricula)
        )
    ).all()

    eventos_by_alumno = {row.id_matricula: int(row.eventos_registrado or 0) for row in ev_rows}
    ins_by_alumno = {row.id_matricula: int(row.proyectos_inscrito or 0) for row in ins_rows}

    alumnos_filtrados = set(eventos_by_alumno.keys()) | set(ins_by_alumno.keys())
    if evento_id is not None:
        rows = (
            await db.execute(
                select(UsuarioEvento.id_matricula).where(UsuarioEvento.id_evento == evento_id)
            )
        ).scalars().all()
        alumnos_filtrados = set(rows)

    grouped: dict[tuple[int, int], int] = defaultdict(int)
    for matricula in alumnos_filtrados:
        key = (eventos_by_alumno.get(matricula, 0), ins_by_alumno.get(matricula, 0))
        grouped[key] += 1

    return [
        {
            "eventos_registrado": eventos,
            "proyectos_inscrito": proyectos,
            "cantidad_alumnos": cantidad,
        }
        for (eventos, proyectos), cantidad in sorted(grouped.items(), key=lambda kv: (kv[0][0], kv[0][1]))
    ]


async def get_ratio_inscritos(
    db: AsyncSession,
    evento_id: int | None = None,
    empresa_id: int | None = None,
    carrera: str | None = None,
) -> list[dict]:
    """Calcula el ratio de inscritos sobre registrados por proyecto."""
    filters = []
    if evento_id is not None:
        filters.append(Proyecto.id_evento == evento_id)
    if empresa_id is not None:
        filters.append(Proyecto.id_empresa == empresa_id)

    # Registrados por evento del proyecto, filtrables por carrera.
    registrados_subq = (
        select(
            UsuarioEvento.id_evento.label("id_evento"),
            func.count(distinct(UsuarioEvento.id_matricula)).label("registrados"),
        )
        .select_from(UsuarioEvento)
        .join(Usuario, Usuario.id_matricula == UsuarioEvento.id_matricula)
    )
    if carrera is not None:
        registrados_subq = registrados_subq.where(Usuario.carrera == carrera)
    registrados_subq = registrados_subq.group_by(UsuarioEvento.id_evento).subquery()

    # Inscritos por proyecto, filtrables por carrera.
    inscritos_subq = (
        select(
            Inscripcion.id_proyecto.label("id_proyecto"),
            func.count(distinct(Inscripcion.id_inscripcion)).label("inscritos"),
        )
        .select_from(Inscripcion)
        .join(Usuario, Usuario.id_matricula == Inscripcion.id_matricula)
    )
    if carrera is not None:
        inscritos_subq = inscritos_subq.where(Usuario.carrera == carrera)
    inscritos_subq = inscritos_subq.group_by(Inscripcion.id_proyecto).subquery()

    rows = (
        await db.execute(
            select(
                Proyecto.id_proyecto,
                Proyecto.nombre_proyecto,
                func.coalesce(registrados_subq.c.registrados, 0).label("registrados"),
                func.coalesce(inscritos_subq.c.inscritos, 0).label("inscritos"),
            )
            .select_from(Proyecto)
            .outerjoin(registrados_subq, registrados_subq.c.id_evento == Proyecto.id_evento)
            .outerjoin(inscritos_subq, inscritos_subq.c.id_proyecto == Proyecto.id_proyecto)
            .where(*filters)
            .order_by(Proyecto.nombre_proyecto.asc())
        )
    ).all()

    result = []
    for row in rows:
        registrados = int(row.registrados or 0)
        inscritos = int(row.inscritos or 0)
        ratio = round((inscritos / registrados) * 100, 2) if registrados > 0 else 0.0
        result.append(
            {
                "id_proyecto": row.id_proyecto,
                "proyecto": row.nombre_proyecto,
                "registrados": registrados,
                "inscritos": inscritos,
                "ratio_inscripcion": ratio,
            }
        )

    return result


async def get_logs_recientes(
    db: AsyncSession,
    limite: int = 10,
) -> list[dict]:
    limite = max(1, min(limite, 50))

    rows = (
        await db.execute(
            select(
                LogAuditoria.id_log,
                LogAuditoria.timestamp,
                LogAuditoria.tipo_evento,
                LogAuditoria.id_matricula,
                LogAuditoria.ip_origen,
                LogAuditoria.detalle,
            )
            .order_by(LogAuditoria.timestamp.desc())
            .limit(limite)
        )
    ).all()

    return [
        {
            "id_log": str(row.id_log),
            "timestamp": row.timestamp.isoformat() if row.timestamp else None,
            "tipo_evento": row.tipo_evento,
            "id_matricula": row.id_matricula,
            "ip_origen": row.ip_origen,
            "detalle": row.detalle,
        }
        for row in rows
    ]


async def _resumen_evento(db: AsyncSession, evento_id: int) -> dict:
    if evento_id is None:
        return {}

    inscritos = int(
        await db.scalar(select(func.count(Inscripcion.id_inscripcion)).where(Inscripcion.id_evento == evento_id)) or 0
    )
    registrados = int(
        await db.scalar(
            select(func.count(distinct(UsuarioEvento.id_matricula))).where(UsuarioEvento.id_evento == evento_id)
        )
        or 0
    )
    espera = int(await db.scalar(select(func.count(ListaEspera.id_espera)).where(ListaEspera.id_evento == evento_id)) or 0)

    capacidad, cupo = (
        await db.execute(
            select(
                func.coalesce(func.sum(Proyecto.capacidad_max), 0),
                func.coalesce(func.sum(Proyecto.cupo_actual), 0),
            ).where(Proyecto.id_evento == evento_id)
        )
    ).one()
    empresas = int(
        await db.scalar(select(func.count(distinct(Proyecto.id_empresa))).where(Proyecto.id_evento == evento_id)) or 0
    )
    proyectos = int(await db.scalar(select(func.count(Proyecto.id_proyecto)).where(Proyecto.id_evento == evento_id)) or 0)

    ocupacion = round((float(cupo) / float(capacidad)) * 100, 2) if capacidad else 0.0
    espera_promedio = round((espera / proyectos), 2) if proyectos else 0.0

    return {
        "evento_id": evento_id,
        "registrados": registrados,
        "inscritos": inscritos,
        "proyectos": proyectos,
        "empresas": empresas,
        "espera_total": espera,
        "espera_promedio": espera_promedio,
        "ocupacion": ocupacion,
    }


async def get_comparativa_eventos(
    db: AsyncSession,
    evento_actual_id: int | None = None,
    evento_anterior_id: int | None = None,
) -> dict:
    actual_id = await _resolve_evento_id(db, evento_actual_id)
    if actual_id is None:
        return {
            "evento_actual": None,
            "evento_anterior": None,
            "radar": [],
            "deltas": {},
        }

    if evento_anterior_id is None:
        evento_anterior_id = await db.scalar(
            select(Evento.id_evento)
            .where(Evento.id_evento < actual_id)
            .order_by(Evento.id_evento.desc())
            .limit(1)
        )

    actual = await _resumen_evento(db, actual_id)
    anterior = await _resumen_evento(db, evento_anterior_id) if evento_anterior_id else None

    radar = [
        {
            "metrica": "Ocupacion",
            "actual": actual.get("ocupacion", 0),
            "anterior": anterior.get("ocupacion", 0) if anterior else 0,
        },
        {
            "metrica": "Registrados",
            "actual": actual.get("registrados", 0),
            "anterior": anterior.get("registrados", 0) if anterior else 0,
        },
        {
            "metrica": "Inscritos",
            "actual": actual.get("inscritos", 0),
            "anterior": anterior.get("inscritos", 0) if anterior else 0,
        },
        {
            "metrica": "Proyectos",
            "actual": actual.get("proyectos", 0),
            "anterior": anterior.get("proyectos", 0) if anterior else 0,
        },
        {
            "metrica": "EsperaProm",
            "actual": actual.get("espera_promedio", 0),
            "anterior": anterior.get("espera_promedio", 0) if anterior else 0,
        },
    ]

    deltas = {}
    if anterior:
        for key in ("registrados", "inscritos", "proyectos", "ocupacion", "espera_promedio"):
            prev = float(anterior.get(key, 0) or 0)
            curr = float(actual.get(key, 0) or 0)
            diff = curr - prev
            pct = round((diff / prev) * 100, 2) if prev else None
            deltas[key] = {
                "diff": round(diff, 2),
                "pct": pct,
            }

    return {
        "evento_actual": actual,
        "evento_anterior": anterior,
        "radar": radar,
        "deltas": deltas,
    }
