import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Inscripcion(Base):
    """
    Registra la inscripción confirmada de un alumno a un proyecto en un evento.
    La constraint UNIQUE (id_matricula, id_evento) garantiza máximo 1 inscripción
    por alumno por evento, incluso si la lógica de aplicación falla.
    """
    __tablename__ = "inscripciones"
    __table_args__ = (
        UniqueConstraint("id_matricula", "id_evento", name="uq_inscripcion_alumno_evento"),
    )

    id_inscripcion: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    id_matricula: Mapped[str] = mapped_column(
        String(20), ForeignKey("usuarios.id_matricula", ondelete="RESTRICT"), nullable=False
    )
    id_proyecto: Mapped[int] = mapped_column(
        Integer, ForeignKey("proyectos.id_proyecto", ondelete="RESTRICT"), nullable=False
    )
    id_evento: Mapped[int] = mapped_column(
        Integer, ForeignKey("eventos.id_evento", ondelete="RESTRICT"), nullable=False
    )
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relaciones
    usuario: Mapped["Usuario"] = relationship("Usuario", back_populates="inscripciones")
    proyecto: Mapped["Proyecto"] = relationship("Proyecto", back_populates="inscripciones")
    evento: Mapped["Evento"] = relationship("Evento", back_populates="inscripciones")
