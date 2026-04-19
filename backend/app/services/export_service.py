"""Servicio de exportación CSV con control por rol y filtros opcionales."""

from __future__ import annotations

import csv
import io
import json
from dataclasses import dataclass
from datetime import date

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.empresa import Empresa
from app.models.evento import Evento
from app.models.inscripcion import Inscripcion
from app.models.log_auditoria import LogAuditoria
from app.models.padron_alumno import PadronAlumno
from app.models.proyecto import Proyecto
from app.models.usuario import Usuario
from app.models.usuario_evento import UsuarioEvento


ALLOWED_DATASETS = {
    "inscripciones",
    "proyectos",
    "empresas",
    "usuarios_padron",
    "logs",
}


@dataclass(slots=True)
class ExportFilters:
    evento_id: int | None = None
    empresa_id: int | None = None
    proyecto_id: int | None = None
    carrera: str | None = None
    fecha_inicio: date | None = None
    fecha_fin: date | None = None
    limite: int = 10000


def _serialize_csv(fieldnames: list[str], rows: list[dict]) -> str:
    """Genera CSV en memoria con BOM UTF-8 para mejor compatibilidad con Excel."""
    stream = io.StringIO(newline="")
    writer = csv.DictWriter(stream, fieldnames=fieldnames, extrasaction="ignore")
    writer.writeheader()
    for row in rows:
        writer.writerow(row)
    return "\ufeff" + stream.getvalue()


async def _rows_inscripciones(
    db: AsyncSession,
    filters: ExportFilters,
    user_role: str,
    user_empresa_id: int | None,
) -> list[dict]:
    query = (
        select(Inscripcion, Usuario, Proyecto, Empresa, Evento)
        .join(Usuario, Usuario.id_matricula == Inscripcion.id_matricula)
        .join(Proyecto, Proyecto.id_proyecto == Inscripcion.id_proyecto)
        .join(Empresa, Empresa.id_empresa == Proyecto.id_empresa)
        .join(Evento, Evento.id_evento == Inscripcion.id_evento)
        .order_by(Inscripcion.timestamp.desc())
    )

    if user_role == "empresa":
        if not user_empresa_id:
            raise HTTPException(status_code=403, detail="Usuario empresa sin empresa asignada")
        query = query.where(Proyecto.id_empresa == user_empresa_id)

    if filters.evento_id is not None:
        query = query.where(Inscripcion.id_evento == filters.evento_id)
    if filters.empresa_id is not None and user_role == "admin":
        query = query.where(Proyecto.id_empresa == filters.empresa_id)
    if filters.proyecto_id is not None:
        query = query.where(Inscripcion.id_proyecto == filters.proyecto_id)
    if filters.carrera:
        query = query.where(Usuario.carrera == filters.carrera)
    if filters.fecha_inicio:
        query = query.where(func.date(Inscripcion.timestamp) >= filters.fecha_inicio)
    if filters.fecha_fin:
        query = query.where(func.date(Inscripcion.timestamp) <= filters.fecha_fin)

    result = await db.execute(query.limit(filters.limite))
    rows: list[dict] = []
    for ins, usuario, proyecto, empresa, evento in result.all():
        rows.append(
            {
                "id_inscripcion": str(ins.id_inscripcion),
                "id_evento": evento.id_evento,
                "evento": evento.nombre,
                "id_empresa": empresa.id_empresa,
                "empresa": empresa.nombre_empresa,
                "id_proyecto": proyecto.id_proyecto,
                "proyecto": proyecto.nombre_proyecto,
                "matricula": usuario.id_matricula,
                "nombre": usuario.nombre,
                "correo": usuario.correo,
                "carrera": usuario.carrera,
                "semestre": usuario.semestre,
                "correo_alterno": usuario.correo_alterno or "",
                "celular": usuario.celular or "",
                "descripcion_personal": usuario.descripcion_personal or "",
                "fecha_inscripcion": ins.timestamp.isoformat() if ins.timestamp else "",
            }
        )
    return rows


async def _rows_proyectos(
    db: AsyncSession,
    filters: ExportFilters,
    user_role: str,
    user_empresa_id: int | None,
) -> list[dict]:
    query = (
        select(Proyecto, Empresa, Evento)
        .join(Empresa, Empresa.id_empresa == Proyecto.id_empresa)
        .join(Evento, Evento.id_evento == Proyecto.id_evento)
        .order_by(Evento.id_evento.desc(), Empresa.nombre_empresa.asc(), Proyecto.nombre_proyecto.asc())
    )

    if user_role == "empresa":
        if not user_empresa_id:
            raise HTTPException(status_code=403, detail="Usuario empresa sin empresa asignada")
        query = query.where(Proyecto.id_empresa == user_empresa_id)

    if filters.evento_id is not None:
        query = query.where(Proyecto.id_evento == filters.evento_id)
    if filters.empresa_id is not None and user_role == "admin":
        query = query.where(Proyecto.id_empresa == filters.empresa_id)
    if filters.proyecto_id is not None:
        query = query.where(Proyecto.id_proyecto == filters.proyecto_id)
    if filters.fecha_inicio:
        query = query.where(func.date(Proyecto.created_at) >= filters.fecha_inicio)
    if filters.fecha_fin:
        query = query.where(func.date(Proyecto.created_at) <= filters.fecha_fin)

    result = await db.execute(query.limit(filters.limite))
    rows: list[dict] = []
    for proyecto, empresa, evento in result.all():
        ocupacion_pct = (proyecto.cupo_actual / proyecto.capacidad_max * 100) if proyecto.capacidad_max else 0
        rows.append(
            {
                "id_proyecto": proyecto.id_proyecto,
                "proyecto": proyecto.nombre_proyecto,
                "descripcion": proyecto.descripcion or "",
                "id_empresa": empresa.id_empresa,
                "empresa": empresa.nombre_empresa,
                "id_evento": evento.id_evento,
                "evento": evento.nombre,
                "capacidad_max": proyecto.capacidad_max,
                "cupo_actual": proyecto.cupo_actual,
                "cupos_disponibles": max(proyecto.capacidad_max - proyecto.cupo_actual, 0),
                "ocupacion_pct": round(ocupacion_pct, 2),
                "evento_activo": evento.activo,
            }
        )
    return rows


async def _rows_empresas(
    db: AsyncSession,
    filters: ExportFilters,
    user_role: str,
    user_empresa_id: int | None,
) -> list[dict]:
    query = select(Empresa).order_by(Empresa.nombre_empresa.asc())

    if user_role == "empresa":
        if not user_empresa_id:
            raise HTTPException(status_code=403, detail="Usuario empresa sin empresa asignada")
        query = query.where(Empresa.id_empresa == user_empresa_id)
    elif filters.empresa_id is not None:
        query = query.where(Empresa.id_empresa == filters.empresa_id)

    result = await db.execute(query.limit(filters.limite))
    return [
        {
            "id_empresa": empresa.id_empresa,
            "nombre_empresa": empresa.nombre_empresa,
            "logo_url": empresa.logo_url or "",
            "created_at": empresa.created_at.isoformat() if empresa.created_at else "",
        }
        for empresa in result.scalars().all()
    ]


async def _rows_usuarios_padron(db: AsyncSession, filters: ExportFilters) -> list[dict]:
    query = (
        select(PadronAlumno, Usuario)
        .outerjoin(Usuario, Usuario.id_matricula == PadronAlumno.id_matricula)
        .order_by(PadronAlumno.id_matricula.asc())
    )

    if filters.carrera:
        query = query.where(PadronAlumno.carrera == filters.carrera)

    if filters.evento_id is not None:
        query = query.outerjoin(
            UsuarioEvento,
            (UsuarioEvento.id_matricula == PadronAlumno.id_matricula)
            & (UsuarioEvento.id_evento == filters.evento_id),
        )
        query = query.where(UsuarioEvento.id_evento == filters.evento_id)

    result = await db.execute(query.limit(filters.limite))
    rows: list[dict] = []
    for padron, usuario in result.all():
        rows.append(
            {
                "matricula": padron.id_matricula,
                "nombre_padron": padron.nombre_completo,
                "carrera": padron.carrera or "",
                "semestre": padron.semestre if padron.semestre is not None else "",
                "usuario_registrado": "si" if usuario else "no",
                "nombre_usuario": usuario.nombre if usuario else "",
                "correo_usuario": usuario.correo if usuario else "",
                "rol_usuario": usuario.rol if usuario else "",
            }
        )
    return rows


async def _rows_logs(db: AsyncSession, filters: ExportFilters) -> list[dict]:
    query = select(LogAuditoria).order_by(LogAuditoria.timestamp.desc())

    if filters.fecha_inicio:
        query = query.where(func.date(LogAuditoria.timestamp) >= filters.fecha_inicio)
    if filters.fecha_fin:
        query = query.where(func.date(LogAuditoria.timestamp) <= filters.fecha_fin)

    result = await db.execute(query.limit(filters.limite))
    return [
        {
            "id_log": str(log.id_log),
            "timestamp": log.timestamp.isoformat() if log.timestamp else "",
            "tipo_evento": log.tipo_evento,
            "id_matricula": log.id_matricula or "",
            "ip_origen": log.ip_origen or "",
            "detalle": log.detalle or "",
        }
        for log in result.scalars().all()
    ]


async def register_export_audit(
    db: AsyncSession,
    actor_matricula: str,
    ip_origen: str | None,
    dataset: str,
    scope: str,
    row_count: int,
    filters: ExportFilters,
) -> None:
    """Registra en auditoría la descarga del CSV."""
    safe_filters = {
        "evento_id": filters.evento_id,
        "empresa_id": filters.empresa_id,
        "proyecto_id": filters.proyecto_id,
        "carrera": filters.carrera,
        "fecha_inicio": filters.fecha_inicio.isoformat() if filters.fecha_inicio else None,
        "fecha_fin": filters.fecha_fin.isoformat() if filters.fecha_fin else None,
        "limite": filters.limite,
    }
    db.add(
        LogAuditoria(
            tipo_evento="EXPORT_CSV",
            id_matricula=actor_matricula,
            ip_origen=ip_origen,
            detalle=json.dumps(
                {
                    "dataset": dataset,
                    "scope": scope,
                    "rows": row_count,
                    "filters": safe_filters,
                },
                ensure_ascii=False,
            ),
        )
    )
    await db.commit()


async def export_dataset_csv(
    db: AsyncSession,
    *,
    dataset: str,
    scope: str,
    filters: ExportFilters,
    user_role: str,
    user_empresa_id: int | None,
) -> tuple[str, int]:
    """Construye el contenido CSV y devuelve (csv_text, row_count)."""
    if dataset not in ALLOWED_DATASETS:
        raise HTTPException(status_code=404, detail="Dataset no soportado")

    if scope not in {"all", "filtered"}:
        raise HTTPException(status_code=400, detail="scope debe ser 'all' o 'filtered'")

    if scope == "all":
        filters = ExportFilters(limite=filters.limite)

    if dataset == "inscripciones":
        rows = await _rows_inscripciones(db, filters, user_role, user_empresa_id)
        fieldnames = [
            "id_inscripcion",
            "id_evento",
            "evento",
            "id_empresa",
            "empresa",
            "id_proyecto",
            "proyecto",
            "matricula",
            "nombre",
            "correo",
            "carrera",
            "semestre",
            "correo_alterno",
            "celular",
            "descripcion_personal",
            "fecha_inscripcion",
        ]
    elif dataset == "proyectos":
        rows = await _rows_proyectos(db, filters, user_role, user_empresa_id)
        fieldnames = [
            "id_proyecto",
            "proyecto",
            "descripcion",
            "id_empresa",
            "empresa",
            "id_evento",
            "evento",
            "capacidad_max",
            "cupo_actual",
            "cupos_disponibles",
            "ocupacion_pct",
            "evento_activo",
        ]
    elif dataset == "empresas":
        rows = await _rows_empresas(db, filters, user_role, user_empresa_id)
        fieldnames = ["id_empresa", "nombre_empresa", "logo_url", "created_at"]
    elif dataset == "usuarios_padron":
        rows = await _rows_usuarios_padron(db, filters)
        fieldnames = [
            "matricula",
            "nombre_padron",
            "carrera",
            "semestre",
            "usuario_registrado",
            "nombre_usuario",
            "correo_usuario",
            "rol_usuario",
        ]
    else:
        rows = await _rows_logs(db, filters)
        fieldnames = ["id_log", "timestamp", "tipo_evento", "id_matricula", "ip_origen", "detalle"]

    return _serialize_csv(fieldnames, rows), len(rows)