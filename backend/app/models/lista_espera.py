import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ListaEspera(Base):
    """
    Registra a un alumno en la lista de espera de un proyecto lleno.
    El orden de llegada (FIFO) se preserva con timestamp_registro.
    Un alumno puede estar en lista de espera de varios proyectos,
    pero no dos veces en el mismo.
    """
    __tablename__ = "lista_espera"
    __table_args__ = (
        UniqueConstraint("id_matricula", "id_proyecto", name="uq_espera_alumno_proyecto"),
    )

    id_espera: Mapped[uuid.UUID] = mapped_column(
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
    timestamp_registro: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relaciones
    usuario: Mapped["Usuario"] = relationship("Usuario", back_populates="lista_espera")
    proyecto: Mapped["Proyecto"] = relationship("Proyecto", back_populates="lista_espera")
