from __future__ import annotations

import re
from datetime import UTC, datetime, timedelta

from sqlalchemy import case, func, literal_column, select
from sqlalchemy.exc import ProgrammingError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.log_auditoria import LogAuditoria
from app.models.request_metric import RequestMetric
from app.models.usuario import Usuario
from app.core.pagination import paginate

APP_STARTED_AT = datetime.now(UTC)


def _extract_email_from_detalle(detalle: str | None) -> str | None:
    if not detalle:
        return None

    # Formato esperado en logs de login fallido: "correo: foo@bar.com"
    match = re.search(r"correo\s*:\s*([^\s]+@[^\s]+)", detalle, flags=re.IGNORECASE)
    if match:
        return match.group(1).strip().lower()
    return None


def _is_missing_request_metrics_table(exc: Exception) -> bool:
    message = str(exc).lower()
    return "request_metrics" in message and "does not exist" in message


def _window_start(minutes: int) -> datetime:
    bounded = max(15, min(minutes, 1440))
    return datetime.now(UTC) - timedelta(minutes=bounded)


async def get_requests_per_minute(db: AsyncSession, window_minutes: int = 60) -> dict:
    start_dt = _window_start(window_minutes)
    minute_bucket = func.date_trunc(literal_column("'minute'"), RequestMetric.request_timestamp)
    try:
        rows = (
            await db.execute(
                select(
                    minute_bucket.label("minute"),
                    func.count(RequestMetric.id_metric).label("requests"),
                )
                .where(RequestMetric.request_timestamp >= start_dt)
                .group_by(minute_bucket)
                .order_by(minute_bucket.asc())
            )
        ).all()
    except ProgrammingError as exc:
        if _is_missing_request_metrics_table(exc):
            rows = []
        else:
            raise

    series = [
        {
            "minute": row.minute.isoformat() if row.minute else None,
            "requests": int(row.requests or 0),
        }
        for row in rows
    ]

    return {
        "window_minutes": max(15, min(window_minutes, 1440)),
        "series": series,
    }


async def get_status_distribution(db: AsyncSession, window_minutes: int = 60) -> dict:
    start_dt = _window_start(window_minutes)
    try:
        rows = (
            await db.execute(
                select(
                    RequestMetric.status_code,
                    func.count(RequestMetric.id_metric).label("cantidad"),
                )
                .where(RequestMetric.request_timestamp >= start_dt)
                .group_by(RequestMetric.status_code)
                .order_by(RequestMetric.status_code.asc())
            )
        ).all()
    except ProgrammingError as exc:
        if _is_missing_request_metrics_table(exc):
            rows = []
        else:
            raise

    total = sum(int(row.cantidad or 0) for row in rows)
    return {
        "window_minutes": max(15, min(window_minutes, 1440)),
        "total": total,
        "items": [
            {
                "status_code": int(row.status_code),
                "cantidad": int(row.cantidad or 0),
                "porcentaje": round((int(row.cantidad or 0) / total) * 100, 2) if total else 0.0,
            }
            for row in rows
        ],
    }


async def get_latency_summary(db: AsyncSession, window_minutes: int = 60) -> dict:
    start_dt = _window_start(window_minutes)
    try:
        avg_ms, min_ms, max_ms, p95_ms = (
            await db.execute(
                select(
                    func.coalesce(func.avg(RequestMetric.duration_ms), 0.0),
                    func.coalesce(func.min(RequestMetric.duration_ms), 0.0),
                    func.coalesce(func.max(RequestMetric.duration_ms), 0.0),
                    func.coalesce(func.percentile_cont(0.95).within_group(RequestMetric.duration_ms), 0.0),
                ).where(RequestMetric.request_timestamp >= start_dt)
            )
        ).one()
    except ProgrammingError as exc:
        if _is_missing_request_metrics_table(exc):
            avg_ms, min_ms, max_ms, p95_ms = (0.0, 0.0, 0.0, 0.0)
        else:
            raise

    return {
        "window_minutes": max(15, min(window_minutes, 1440)),
        "avg_ms": round(float(avg_ms or 0.0), 2),
        "min_ms": round(float(min_ms or 0.0), 2),
        "max_ms": round(float(max_ms or 0.0), 2),
        "p95_ms": round(float(p95_ms or 0.0), 2),
    }


async def get_login_activity(db: AsyncSession, window_minutes: int = 60) -> dict:
    start_dt = _window_start(window_minutes)
    minute_bucket = func.date_trunc(literal_column("'minute'"), LogAuditoria.timestamp)
    rows = (
        await db.execute(
            select(
                minute_bucket.label("minute"),
                func.sum(
                    case(
                        (
                            LogAuditoria.tipo_evento.in_(["LOGIN_EXITOSO", "LOGIN_GOOGLE_EXITOSO"]),
                            1,
                        ),
                        else_=0,
                    )
                ).label("exitosos"),
                func.sum(
                    case(
                        (
                            LogAuditoria.tipo_evento.in_(["LOGIN_FALLIDO", "GOOGLE_LOGIN_FALLIDO"]),
                            1,
                        ),
                        else_=0,
                    )
                ).label("fallidos"),
            )
            .where(
                LogAuditoria.timestamp >= start_dt,
                LogAuditoria.tipo_evento.in_(
                    ["LOGIN_EXITOSO", "LOGIN_FALLIDO", "LOGIN_GOOGLE_EXITOSO", "GOOGLE_LOGIN_FALLIDO"]
                ),
            )
            .group_by(minute_bucket)
            .order_by(minute_bucket.asc())
        )
    ).all()

    total_exitosos = 0
    total_fallidos = 0
    series = []
    for row in rows:
        exitosos = int(row.exitosos or 0)
        fallidos = int(row.fallidos or 0)
        total_exitosos += exitosos
        total_fallidos += fallidos
        series.append(
            {
                "minute": row.minute.isoformat() if row.minute else None,
                "logins_exitosos": exitosos,
                "logins_fallidos": fallidos,
            }
        )

    total = total_exitosos + total_fallidos
    success_rate = round((total_exitosos / total) * 100, 2) if total else 0.0

    return {
        "window_minutes": max(15, min(window_minutes, 1440)),
        "totales": {
            "logins_exitosos": total_exitosos,
            "logins_fallidos": total_fallidos,
            "success_rate": success_rate,
        },
        "series": series,
    }


async def get_operational_summary(db: AsyncSession, window_minutes: int = 60) -> dict:
    start_dt = _window_start(window_minutes)
    uptime_seconds = int((datetime.now(UTC) - APP_STARTED_AT).total_seconds())
    try:
        total_requests = int(
            await db.scalar(
                select(func.count(RequestMetric.id_metric)).where(RequestMetric.request_timestamp >= start_dt)
            )
            or 0
        )
        total_5xx = int(
            await db.scalar(
                select(func.count(RequestMetric.id_metric)).where(
                    RequestMetric.request_timestamp >= start_dt,
                    RequestMetric.status_code >= 500,
                )
            )
            or 0
        )
        # Agregar métricas de latencia al resumen
        avg_ms, p95_ms = (
            await db.execute(
                select(
                    func.coalesce(func.avg(RequestMetric.duration_ms), 0.0),
                    func.coalesce(func.percentile_cont(0.95).within_group(RequestMetric.duration_ms), 0.0),
                ).where(RequestMetric.request_timestamp >= start_dt)
            )
        ).one()
    except ProgrammingError as exc:
        if _is_missing_request_metrics_table(exc):
            total_requests = 0
            total_5xx = 0
            avg_ms = 0.0
            p95_ms = 0.0
        else:
            raise
    error_rate_5xx = round((total_5xx / total_requests) * 100, 2) if total_requests else 0.0

    return {
        "window_minutes": max(15, min(window_minutes, 1440)),
        "uptime_seconds": uptime_seconds,
        "estado": "operativo",
        "requests_total": total_requests,
        "errores_5xx": total_5xx,
        "error_rate_5xx": error_rate_5xx,
        "latencia_avg_ms": round(float(avg_ms or 0.0), 2),
        "latencia_p95_ms": round(float(p95_ms or 0.0), 2),
    }


async def get_login_events(db: AsyncSession, page: int = 1, page_size: int = 50) -> dict:
    base_query = (
        select(
            LogAuditoria.id_log,
            LogAuditoria.timestamp,
            LogAuditoria.tipo_evento,
            LogAuditoria.id_matricula,
            LogAuditoria.ip_origen,
            LogAuditoria.detalle,
            Usuario.correo.label("correo"),
        )
        .outerjoin(Usuario, Usuario.id_matricula == LogAuditoria.id_matricula)
        .where(
            LogAuditoria.tipo_evento.in_(
                ["LOGIN_EXITOSO", "LOGIN_FALLIDO", "GOOGLE_LOGIN_FALLIDO", "LOGIN_GOOGLE_EXITOSO"]
            )
        )
        .order_by(LogAuditoria.timestamp.desc())
    )

    result = await paginate(db, base_query, page, page_size)
    result["data"] = [
        {
            "id_log": str(row.id_log),
            "hora": row.timestamp.isoformat() if row.timestamp else None,
            "correo": (row.correo or _extract_email_from_detalle(row.detalle) or "-").lower() if (row.correo or _extract_email_from_detalle(row.detalle)) else "-",
            "estatus": "EXITO" if row.tipo_evento in ["LOGIN_EXITOSO", "LOGIN_GOOGLE_EXITOSO"] else "FALLIDO",
            "tipo_evento": row.tipo_evento,
            "metodo": "GOOGLE" if "GOOGLE" in (row.tipo_evento or "") else "PASSWORD",
            "ip_origen": row.ip_origen,
            "id_matricula": row.id_matricula,
        }
        for row in result["data"]
    ]
    return result
