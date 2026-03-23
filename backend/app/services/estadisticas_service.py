from __future__ import annotations

from collections import defaultdict
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import and_, desc, distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.empresa import Empresa
from app.models.evento import Evento
from app.models.inscripcion import Inscripcion
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
    include_security_metrics: bool = True,
) -> dict:
    selected_evento_id = await _resolve_evento_id(db, evento_id)
    start_dt, end_dt = _normalize_date_range(fecha_inicio, fecha_fin)

    total_registrados = 0
    total_inscritos = 0
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
        if start_dt is not None:
            ins_filters.append(Inscripcion.timestamp >= start_dt)
        if end_dt is not None:
            ins_filters.append(Inscripcion.timestamp <= end_dt)

        total_inscritos = int(await db.scalar(select(func.count(Inscripcion.id_inscripcion)).where(and_(*ins_filters))) or 0)

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

    login_fallidos_7d = 0
    if include_security_metrics:
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
        "empresas_participantes": total_empresas,
        "intentos_login_fallido_7d": login_fallidos_7d,
    }


async def get_general_contract(
    db: AsyncSession,
    evento_id: int | None = None,
    carrera: str | None = None,
    fecha_inicio: date | None = None,
    fecha_fin: date | None = None,
    timeline_ventana: str = "24h",
) -> dict:
    kpis = await get_kpis(
        db,
        evento_id=evento_id,
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin,
        include_security_metrics=False,
    )
    ocupacion_eventos = await get_ocupacion_eventos(db, evento_id)
    alumnos_por_carrera = await get_alumnos_por_carrera(db, evento_id, None)
    tendencia = await get_inscripciones_timeline(
        db,
        evento_id=evento_id,
        carrera=carrera,
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin,
        ventana=timeline_ventana,
    )

    return {
        "filtros_aplicados": {
            "evento_id": evento_id,
            "carrera": carrera,
            "fecha_inicio": fecha_inicio.isoformat() if fecha_inicio else None,
            "fecha_fin": fecha_fin.isoformat() if fecha_fin else None,
            "timeline_ventana": timeline_ventana,
        },
        "kpis": {
            "total_alumnos_registrados": kpis.get("total_alumnos_registrados", 0),
            "total_inscritos": kpis.get("total_inscritos", 0),
            "ocupacion_promedio": kpis.get("ocupacion_promedio", 0),
            "empresas_participantes": kpis.get("empresas_participantes", 0),
        },
        "series": {
            "ocupacion_eventos": ocupacion_eventos,
            "alumnos_por_carrera": alumnos_por_carrera,
            "inscripciones_timeline": tendencia,
        },
    }


async def get_particular_contract(
    db: AsyncSession,
    evento_id: int | None = None,
    empresa_id: int | None = None,
    proyecto_id: int | None = None,
    carrera: str | None = None,
    fecha_inicio: date | None = None,
    fecha_fin: date | None = None,
    timeline_ventana: str = "24h",
) -> dict:
    kpis = await get_kpis(
        db,
        evento_id=evento_id,
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin,
        include_security_metrics=False,
    )

    proyectos_cupo = await get_proyectos_cupo(db, evento_id=evento_id, empresa_id=empresa_id)
    if proyecto_id is not None:
        proyectos_cupo = [item for item in proyectos_cupo if int(item.get("id_proyecto", 0)) == proyecto_id]

    alumnos_empresa = await get_alumnos_por_empresa(db, evento_id)
    ratio = await get_ratio_inscritos(db, evento_id=evento_id, empresa_id=empresa_id, carrera=carrera)
    if proyecto_id is not None:
        ratio = [item for item in ratio if int(item.get("id_proyecto", 0)) == proyecto_id]

    timeline = await get_inscripciones_timeline(
        db,
        evento_id=evento_id,
        empresa_id=empresa_id,
        proyecto_id=proyecto_id,
        carrera=carrera,
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin,
        ventana=timeline_ventana,
    )

    return {
        "filtros_aplicados": {
            "evento_id": evento_id,
            "empresa_id": empresa_id,
            "proyecto_id": proyecto_id,
            "carrera": carrera,
            "fecha_inicio": fecha_inicio.isoformat() if fecha_inicio else None,
            "fecha_fin": fecha_fin.isoformat() if fecha_fin else None,
            "timeline_ventana": timeline_ventana,
        },
        "resumen": {
            "total_alumnos_registrados": kpis.get("total_alumnos_registrados", 0),
            "total_inscritos": kpis.get("total_inscritos", 0),
            "ocupacion_promedio": kpis.get("ocupacion_promedio", 0),
        },
        "series": {
            "proyectos_cupo": proyectos_cupo,
            "alumnos_por_empresa": alumnos_empresa,
            "ratio_inscritos": ratio,
            "inscripciones_timeline": timeline,
        },
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
                Empresa.id_empresa,
                Empresa.nombre_empresa,
            )
            .join(Empresa, Empresa.id_empresa == Proyecto.id_empresa)
            .where(*filters)
            .group_by(
                Proyecto.id_proyecto,
                Proyecto.nombre_proyecto,
                Proyecto.id_evento,
                Proyecto.capacidad_max,
                Proyecto.cupo_actual,
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
        }
        for row in rows
    ]


async def get_alertas_proyectos(
    db: AsyncSession,
    evento_id: int | None = None,
    empresa_id: int | None = None,
    proyecto_id: int | None = None,
    min_ocupacion_pct: float = 40.0,
    ocupacion_alta_pct: float = 90.0,
) -> dict:
    min_ocupacion_pct = float(max(0.0, min(min_ocupacion_pct, 100.0)))
    ocupacion_alta_pct = float(max(0.0, min(ocupacion_alta_pct, 100.0)))
    if ocupacion_alta_pct < min_ocupacion_pct:
        ocupacion_alta_pct = min_ocupacion_pct

    proyectos = await get_proyectos_cupo(db, evento_id=evento_id, empresa_id=empresa_id)
    if proyecto_id is not None:
        proyectos = [item for item in proyectos if int(item.get("id_proyecto", 0)) == proyecto_id]

    alerts = []
    counters = {
        "baja_ocupacion": 0,
        "alta_ocupacion": 0,
        "sin_alerta": 0,
    }

    for item in proyectos:
        capacidad = int(item.get("capacidad_max") or 0)
        inscritos = int(item.get("cupo_actual") or 0)

        ocupacion_pct = round((inscritos / capacidad) * 100, 2) if capacidad else 0.0

        project_flags: list[str] = []
        if ocupacion_pct <= min_ocupacion_pct:
            counters["baja_ocupacion"] += 1
            project_flags.append("baja_ocupacion")
        if ocupacion_pct >= ocupacion_alta_pct:
            counters["alta_ocupacion"] += 1
            project_flags.append("alta_ocupacion")
        if not project_flags:
            counters["sin_alerta"] += 1
            continue

        if project_flags:
            alerts.append(
                {
                    "id_proyecto": item.get("id_proyecto"),
                    "proyecto": item.get("proyecto"),
                    "id_evento": item.get("id_evento"),
                    "id_empresa": item.get("id_empresa"),
                    "empresa": item.get("empresa"),
                    "ocupacion_pct": ocupacion_pct,
                    "flags": project_flags,
                    "capacidad_max": capacidad,
                    "cupo_actual": inscritos,
                }
            )

    alerts.sort(
        key=lambda item: (
            -len(item.get("flags", [])),
            item.get("ocupacion_pct") if "baja_ocupacion" in item.get("flags", []) else -(item.get("ocupacion_pct") or 0),
            item.get("proyecto") or "",
        )
    )

    return {
        "filtros_aplicados": {
            "evento_id": evento_id,
            "empresa_id": empresa_id,
            "proyecto_id": proyecto_id,
            "min_ocupacion_pct": min_ocupacion_pct,
            "ocupacion_alta_pct": ocupacion_alta_pct,
        },
        "resumen": {
            "total_proyectos": len(proyectos),
            "con_alertas": len(alerts),
            "baja_ocupacion": counters["baja_ocupacion"],
            "alta_ocupacion": counters["alta_ocupacion"],
            "sin_alerta": counters["sin_alerta"],
        },
        "items": alerts,
    }


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
    reg_filters = []
    ins_filters = []
    if evento_id is not None:
        reg_filters.append(UsuarioEvento.id_evento == evento_id)
        ins_filters.append(Inscripcion.id_evento == evento_id)
    if carrera is not None:
        reg_filters.append(Usuario.carrera == carrera)
        ins_filters.append(Usuario.carrera == carrera)

    reg_rows = (
        await db.execute(
            select(
                Usuario.carrera,
                Usuario.semestre,
                func.count(distinct(UsuarioEvento.id_matricula)).label("registrados"),
            )
            .select_from(Usuario)
            .join(UsuarioEvento, UsuarioEvento.id_matricula == Usuario.id_matricula)
            .where(*reg_filters)
            .group_by(Usuario.carrera, Usuario.semestre)
        )
    ).all()

    ins_rows = (
        await db.execute(
            select(
                Usuario.carrera,
                Usuario.semestre,
                func.count(distinct(Inscripcion.id_matricula)).label("inscritos"),
            )
            .select_from(Usuario)
            .join(Inscripcion, Inscripcion.id_matricula == Usuario.id_matricula)
            .where(*ins_filters)
            .group_by(Usuario.carrera, Usuario.semestre)
        )
    ).all()

    grouped: dict[tuple[str, int], dict] = {}
    for row in reg_rows:
        key = (row.carrera, int(row.semestre or 0))
        grouped[key] = {
            "carrera": row.carrera,
            "semestre": int(row.semestre or 0),
            "registrados": int(row.registrados or 0),
            "inscritos": 0,
        }

    for row in ins_rows:
        key = (row.carrera, int(row.semestre or 0))
        if key not in grouped:
            grouped[key] = {
                "carrera": row.carrera,
                "semestre": int(row.semestre or 0),
                "registrados": 0,
                "inscritos": int(row.inscritos or 0),
            }
        else:
            grouped[key]["inscritos"] = int(row.inscritos or 0)

    carrera_map: dict[str, dict] = {}
    for (_, _), row in sorted(grouped.items(), key=lambda item: (item[0][0], item[0][1])):
        carrera_name = row["carrera"]
        if carrera_name not in carrera_map:
            carrera_map[carrera_name] = {
                "carrera": carrera_name,
                "cantidad": 0,
                "cantidad_inscritos": 0,
                "cantidad_sin_proyecto": 0,
                "por_semestre": [],
            }

        sin_proyecto = max(row["registrados"] - row["inscritos"], 0)
        carrera_map[carrera_name]["cantidad"] += row["registrados"]
        carrera_map[carrera_name]["cantidad_inscritos"] += row["inscritos"]
        carrera_map[carrera_name]["cantidad_sin_proyecto"] += sin_proyecto
        carrera_map[carrera_name]["por_semestre"].append(
            {
                "semestre": row["semestre"],
                "cantidad": row["registrados"],
                "inscritos": row["inscritos"],
                "sin_proyecto": sin_proyecto,
            }
        )

    return sorted(carrera_map.values(), key=lambda item: item["cantidad"], reverse=True)


def _resolve_timeline_window(ventana: str | None, horas: int | None = None) -> tuple[str, int, int]:
    if horas is not None:
        bounded = max(1, min(horas, 24 * 30))
        if bounded <= 1:
            return "1h", 60, 5
        if bounded <= 24:
            return "24h", 24 * 60, 60
        if bounded <= 24 * 7:
            return "7d", 24 * 7 * 60, 6 * 60
        return "30d", 24 * 30 * 60, 24 * 60

    key = (ventana or "24h").strip().lower()
    mapping = {
        "1h": (60, 5),
        "24h": (24 * 60, 60),
        "1d": (24 * 60, 60),
        "7d": (24 * 7 * 60, 6 * 60),
        "1w": (24 * 7 * 60, 6 * 60),
        "30d": (24 * 30 * 60, 24 * 60),
        "1m": (24 * 30 * 60, 24 * 60),
    }
    minutes, step = mapping.get(key, mapping["24h"])
    normalized = "24h" if key not in mapping else key
    if normalized == "1d":
        normalized = "24h"
    if normalized == "1w":
        normalized = "7d"
    if normalized == "1m":
        normalized = "30d"
    return normalized, minutes, step


def _bucket_floor(ts: datetime, step_minutes: int) -> datetime:
    ts_utc = ts.astimezone(UTC)
    ts_utc = ts_utc.replace(second=0, microsecond=0)
    total_minutes = ts_utc.hour * 60 + ts_utc.minute
    floored_minutes = (total_minutes // step_minutes) * step_minutes
    hour = floored_minutes // 60
    minute = floored_minutes % 60
    return ts_utc.replace(hour=hour, minute=minute)


async def get_inscripciones_timeline(
    db: AsyncSession,
    evento_id: int | None = None,
    empresa_id: int | None = None,
    proyecto_id: int | None = None,
    carrera: str | None = None,
    fecha_inicio: date | None = None,
    fecha_fin: date | None = None,
    horas: int | None = None,
    ventana: str = "24h",
) -> list[dict]:
    _, window_minutes, step_minutes = _resolve_timeline_window(ventana=ventana, horas=horas)
    now = datetime.now(UTC).replace(second=0, microsecond=0)
    start_dt = now - timedelta(minutes=window_minutes)
    end_dt = now

    if fecha_inicio is not None:
        explicit_start = datetime.combine(fecha_inicio, datetime.min.time(), tzinfo=UTC)
        start_dt = max(start_dt, explicit_start)
    if fecha_fin is not None:
        explicit_end = datetime.combine(fecha_fin, datetime.max.time(), tzinfo=UTC)
        end_dt = min(end_dt, explicit_end)

    if start_dt > end_dt:
        return []

    start_bucket = _bucket_floor(start_dt, step_minutes)
    end_bucket = _bucket_floor(end_dt, step_minutes)

    filters = [Inscripcion.timestamp >= start_dt, Inscripcion.timestamp <= end_dt]
    base_filters = []
    if evento_id is not None:
        filters.append(Inscripcion.id_evento == evento_id)
        base_filters.append(Inscripcion.id_evento == evento_id)

    needs_proyecto_join = empresa_id is not None
    if empresa_id is not None:
        filters.append(Proyecto.id_empresa == empresa_id)
        base_filters.append(Proyecto.id_empresa == empresa_id)
    if proyecto_id is not None:
        filters.append(Inscripcion.id_proyecto == proyecto_id)
        base_filters.append(Inscripcion.id_proyecto == proyecto_id)

    needs_usuario_join = carrera is not None
    if carrera is not None:
        filters.append(Usuario.carrera == carrera)
        base_filters.append(Usuario.carrera == carrera)

    count_stmt = select(func.count(Inscripcion.id_inscripcion)).select_from(Inscripcion)
    if needs_proyecto_join:
        count_stmt = count_stmt.join(Proyecto, Proyecto.id_proyecto == Inscripcion.id_proyecto)
    if needs_usuario_join:
        count_stmt = count_stmt.join(Usuario, Usuario.id_matricula == Inscripcion.id_matricula)
    current_total = int(await db.scalar(count_stmt.where(*base_filters)) or 0)

    timeline_stmt = select(Inscripcion.timestamp).select_from(Inscripcion)
    if needs_proyecto_join:
        timeline_stmt = timeline_stmt.join(Proyecto, Proyecto.id_proyecto == Inscripcion.id_proyecto)
    if needs_usuario_join:
        timeline_stmt = timeline_stmt.join(Usuario, Usuario.id_matricula == Inscripcion.id_matricula)
    rows = (
        await db.execute(
            timeline_stmt
            .where(*filters)
            .order_by(Inscripcion.timestamp.asc())
        )
    ).scalars().all()

    positivos_en_ventana = len(rows)

    # Para reflejar "bajones" tras eliminaciones recientes (como en vista trading),
    # se incorporan deltas negativos desde auditoría en el mismo timeline.
    deleted_events = []
    if empresa_id is None and proyecto_id is None and carrera is None:
        deleted_events = (
            await db.execute(
                select(LogAuditoria.timestamp)
                .where(
                    LogAuditoria.timestamp >= start_dt,
                    LogAuditoria.timestamp <= end_dt,
                    LogAuditoria.tipo_evento.in_(["INSCRIPCION_ELIMINADA_ADMIN", "INSCRIPCION_ELIMINADA_EMPRESA"]),
                )
                .order_by(LogAuditoria.timestamp.asc())
            )
        ).scalars().all()

    negativos_en_ventana = len(deleted_events)

    bucket_delta: dict[datetime, int] = defaultdict(int)
    for ts in rows:
        if ts is None:
            continue
        bucket_delta[_bucket_floor(ts, step_minutes)] += 1

    for ts in deleted_events:
        if ts is None:
            continue
        bucket_delta[_bucket_floor(ts, step_minutes)] -= 1

    baseline = max(current_total - positivos_en_ventana + negativos_en_ventana, 0)

    response = []
    acumulado = baseline
    cursor = start_bucket
    while cursor <= end_bucket:
        delta = bucket_delta.get(cursor, 0)
        acumulado = max(acumulado + delta, 0)
        response.append(
            {
                "timestamp": cursor.isoformat(),
                "cantidad_nueva": delta,
                "acumulado": acumulado,
            }
        )
        cursor += timedelta(minutes=step_minutes)

    return response

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


async def get_embudo_conversion(
    db: AsyncSession,
    evento_id: int | None = None,
    empresa_id: int | None = None,
    proyecto_id: int | None = None,
    carrera: str | None = None,
    fecha_inicio: date | None = None,
    fecha_fin: date | None = None,
) -> dict:
    selected_evento_id = await _resolve_evento_id(db, evento_id)
    if selected_evento_id is None:
        return {
            "filtros_aplicados": {
                "evento_id": evento_id,
                "evento_id_resuelto": None,
                "empresa_id": empresa_id,
                "proyecto_id": proyecto_id,
                "carrera": carrera,
                "fecha_inicio": fecha_inicio.isoformat() if fecha_inicio else None,
                "fecha_fin": fecha_fin.isoformat() if fecha_fin else None,
            },
            "etapas": [
                {"key": "registrados", "etapa": "Registrados", "valor": 0},
                {"key": "inscritos", "etapa": "Inscritos", "valor": 0},
                {"key": "sin_asignar", "etapa": "Sin Asignar", "valor": 0},
            ],
            "metricas": {
                "conversion_pct": 0.0,
                "sin_asignar": 0,
            },
        }

    start_dt, end_dt = _normalize_date_range(fecha_inicio, fecha_fin)

    reg_filters = [UsuarioEvento.id_evento == selected_evento_id]
    if start_dt is not None:
        reg_filters.append(UsuarioEvento.created_at >= start_dt)
    if end_dt is not None:
        reg_filters.append(UsuarioEvento.created_at <= end_dt)

    reg_stmt = select(func.count(distinct(UsuarioEvento.id_matricula))).select_from(UsuarioEvento)
    if carrera is not None:
        reg_stmt = reg_stmt.join(Usuario, Usuario.id_matricula == UsuarioEvento.id_matricula)
        reg_filters.append(Usuario.carrera == carrera)
    registrados = int(await db.scalar(reg_stmt.where(*reg_filters)) or 0)

    ins_filters = [Inscripcion.id_evento == selected_evento_id]

    if start_dt is not None:
        ins_filters.append(Inscripcion.timestamp >= start_dt)
    if end_dt is not None:
        ins_filters.append(Inscripcion.timestamp <= end_dt)

    ins_stmt = select(func.count(distinct(Inscripcion.id_matricula))).select_from(Inscripcion)

    if empresa_id is not None:
        ins_stmt = ins_stmt.join(Proyecto, Proyecto.id_proyecto == Inscripcion.id_proyecto)
        ins_filters.append(Proyecto.id_empresa == empresa_id)

    if proyecto_id is not None:
        ins_filters.append(Inscripcion.id_proyecto == proyecto_id)

    if carrera is not None:
        ins_stmt = ins_stmt.join(Usuario, Usuario.id_matricula == Inscripcion.id_matricula)
        ins_filters.append(Usuario.carrera == carrera)

    inscritos = int(await db.scalar(ins_stmt.where(*ins_filters)) or 0)

    sin_asignar = max(registrados - inscritos, 0)
    conversion_pct = round((inscritos / registrados) * 100, 2) if registrados else 0.0

    return {
        "filtros_aplicados": {
            "evento_id": evento_id,
            "evento_id_resuelto": selected_evento_id,
            "empresa_id": empresa_id,
            "proyecto_id": proyecto_id,
            "carrera": carrera,
            "fecha_inicio": fecha_inicio.isoformat() if fecha_inicio else None,
            "fecha_fin": fecha_fin.isoformat() if fecha_fin else None,
        },
        "etapas": [
            {"key": "registrados", "etapa": "Registrados", "valor": registrados},
            {"key": "inscritos", "etapa": "Inscritos", "valor": inscritos},
            {"key": "sin_asignar", "etapa": "Sin Asignar", "valor": sin_asignar},
        ],
        "metricas": {
            "conversion_pct": conversion_pct,
            "sin_asignar": sin_asignar,
        },
    }


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

    return {
        "evento_id": evento_id,
        "registrados": registrados,
        "inscritos": inscritos,
        "proyectos": proyectos,
        "empresas": empresas,
        "ocupacion": ocupacion,
    }


async def _resumen_eventos_bulk(db: AsyncSession, evento_ids: list[int]) -> dict[int, dict]:
    unique_ids = sorted({int(eid) for eid in evento_ids if eid is not None})
    if not unique_ids:
        return {}

    inscritos_rows = (
        await db.execute(
            select(
                Inscripcion.id_evento,
                func.count(Inscripcion.id_inscripcion).label("inscritos"),
            )
            .where(Inscripcion.id_evento.in_(unique_ids))
            .group_by(Inscripcion.id_evento)
        )
    ).all()

    registrados_rows = (
        await db.execute(
            select(
                UsuarioEvento.id_evento,
                func.count(distinct(UsuarioEvento.id_matricula)).label("registrados"),
            )
            .where(UsuarioEvento.id_evento.in_(unique_ids))
            .group_by(UsuarioEvento.id_evento)
        )
    ).all()

    proyectos_rows = (
        await db.execute(
            select(
                Proyecto.id_evento,
                func.count(Proyecto.id_proyecto).label("proyectos"),
                func.count(distinct(Proyecto.id_empresa)).label("empresas"),
                func.coalesce(func.sum(Proyecto.capacidad_max), 0).label("capacidad"),
                func.coalesce(func.sum(Proyecto.cupo_actual), 0).label("cupo"),
            )
            .where(Proyecto.id_evento.in_(unique_ids))
            .group_by(Proyecto.id_evento)
        )
    ).all()

    inscritos_map = {int(row.id_evento): int(row.inscritos or 0) for row in inscritos_rows}
    registrados_map = {int(row.id_evento): int(row.registrados or 0) for row in registrados_rows}
    proyectos_map = {
        int(row.id_evento): {
            "proyectos": int(row.proyectos or 0),
            "empresas": int(row.empresas or 0),
            "capacidad": float(row.capacidad or 0),
            "cupo": float(row.cupo or 0),
        }
        for row in proyectos_rows
    }

    resumen = {}
    for evento_id in unique_ids:
        proy = proyectos_map.get(evento_id, {})
        capacidad = float(proy.get("capacidad", 0) or 0)
        cupo = float(proy.get("cupo", 0) or 0)
        proyectos = int(proy.get("proyectos", 0) or 0)

        resumen[evento_id] = {
            "evento_id": evento_id,
            "registrados": int(registrados_map.get(evento_id, 0)),
            "inscritos": int(inscritos_map.get(evento_id, 0)),
            "proyectos": proyectos,
            "empresas": int(proy.get("empresas", 0) or 0),
            "ocupacion": round((cupo / capacidad) * 100, 2) if capacidad else 0.0,
        }

    return resumen


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

    bulk_resumen = await _resumen_eventos_bulk(
        db,
        [actual_id, evento_anterior_id] if evento_anterior_id else [actual_id],
    )
    actual = bulk_resumen.get(actual_id, await _resumen_evento(db, actual_id))
    anterior = bulk_resumen.get(evento_anterior_id) if evento_anterior_id else None

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
    ]

    deltas = {}
    if anterior:
        for key in ("registrados", "inscritos", "proyectos", "ocupacion"):
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
