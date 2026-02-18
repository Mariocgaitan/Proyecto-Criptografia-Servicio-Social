from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class UsuarioEvento(Base):
    """
    Tabla pivote: relación muchos-a-muchos entre Usuarios y Eventos.
    Un alumno puede seleccionar 1 o 2 eventos al registrarse.
    """
    __tablename__ = "usuario_eventos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    id_matricula: Mapped[str] = mapped_column(
        String(20), ForeignKey("usuarios.id_matricula", ondelete="CASCADE"), nullable=False
    )
    id_evento: Mapped[int] = mapped_column(
        Integer, ForeignKey("eventos.id_evento", ondelete="CASCADE"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relaciones
    usuario: Mapped["Usuario"] = relationship("Usuario", back_populates="usuario_eventos")
    evento: Mapped["Evento"] = relationship("Evento", back_populates="usuario_eventos")
