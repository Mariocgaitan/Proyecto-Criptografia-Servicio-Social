from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Evento(Base):
    """
    Representa un período de inscripción (INVIERNO, FEB_JUN, VERANO, AGO_DIC).
    Solo un evento puede estar activo a la vez.
    """
    __tablename__ = "eventos"

    id_evento: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    periodo: Mapped[str] = mapped_column(
        String(20), nullable=False,
        comment="INVIERNO | FEB_JUN | VERANO | AGO_DIC"
    )
    anio: Mapped[int] = mapped_column(Integer, nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    fecha_inicio: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    fecha_fin: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relaciones
    usuario_eventos: Mapped[list["UsuarioEvento"]] = relationship(
        "UsuarioEvento", back_populates="evento"
    )
    proyectos: Mapped[list["Proyecto"]] = relationship(
        "Proyecto", back_populates="evento"
    )
    inscripciones: Mapped[list["Inscripcion"]] = relationship(
        "Inscripcion", back_populates="evento"
    )
