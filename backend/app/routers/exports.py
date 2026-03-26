"""Router para exportación de datos en CSV."""

from __future__ import annotations

from datetime import date, datetime
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.services.export_service import ExportFilters, export_dataset_csv, register_export_audit

router = APIRouter()


@router.get("/api/v1/export/{dataset}.csv", tags=["Export"])
async def export_csv(
    dataset: str,
    request: Request,
    scope: str = Query(default="all", pattern="^(all|filtered)$"),
    evento_id: int | None = Query(default=None),
    empresa_id: int | None = Query(default=None),
    proyecto_id: int | None = Query(default=None),
    carrera: str | None = Query(default=None),
    fecha_inicio: date | None = Query(default=None),
    fecha_fin: date | None = Query(default=None),
    limite: int = Query(default=10000, ge=1, le=50000),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Descarga CSV por dataset con soporte de scope all/filtered."""
    if current_user.rol not in {"admin", "empresa"}:
        raise HTTPException(status_code=403, detail="Acceso denegado")

    if current_user.rol == "empresa" and dataset in {"usuarios_padron", "logs"}:
        raise HTTPException(status_code=403, detail="No tienes permisos para este dataset")

    filters = ExportFilters(
        evento_id=evento_id,
        empresa_id=empresa_id,
        proyecto_id=proyecto_id,
        carrera=carrera,
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin,
        limite=limite,
    )

    csv_text, row_count = await export_dataset_csv(
        db,
        dataset=dataset,
        scope=scope,
        filters=filters,
        user_role=current_user.rol,
        user_empresa_id=current_user.id_empresa,
    )

    try:
        await register_export_audit(
            db,
            actor_matricula=current_user.id_matricula,
            ip_origen=request.client.host if request.client else None,
            dataset=dataset,
            scope=scope,
            row_count=row_count,
            filters=filters,
        )
    except Exception:
        await db.rollback()

    today = datetime.now().strftime("%Y-%m-%d")
    filename = f"{dataset}-{scope}-{today}.csv"
    content_disposition = f"attachment; filename*=UTF-8''{quote(filename)}"
    return Response(
        content=csv_text,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": content_disposition},
    )