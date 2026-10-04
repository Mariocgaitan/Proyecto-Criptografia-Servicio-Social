from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Proyecto(Base):
    """
    Representa un proyecto/oportunidad ofrecido por una socioformador en un evento.
    """
    __tablename__ = "proyectos"

    id_proyecto: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    id_socioformador: Mapped[int] = mapped_column(
        Integer, ForeignKey("socioformadores.id_socioformador", ondelete="RESTRICT"), nullable=False
    )
    id_evento: Mapped[int] = mapped_column(
        Integer, ForeignKey("eventos.id_evento", ondelete="RESTRICT"), nullable=False
    )
    nombre_proyecto: Mapped[str] = mapped_column(String(200), nullable=False)
    descripcion: Mapped[str | None] = mapped_column(Text, nullable=True)
    capacidad_max: Mapped[int] = mapped_column(Integer, nullable=False)
    cupo_actual: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relaciones
    socioformador: Mapped["Socioformador"] = relationship("Socioformador", back_populates="proyectos")
    evento: Mapped["Evento"] = relationship("Evento", back_populates="proyectos")
    inscripciones: Mapped[list["Inscripcion"]] = relationship(
        "Inscripcion", back_populates="proyecto"
    )
