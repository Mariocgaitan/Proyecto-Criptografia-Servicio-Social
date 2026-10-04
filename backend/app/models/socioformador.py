from datetime import datetime

from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Socioformador(Base):
    """
    Representa una socioformador participante en el evento de vinculación.
    """
    __tablename__ = "socioformadores"

    id_socioformador: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nombre_socioformador: Mapped[str] = mapped_column(String(150), nullable=False)
    logo_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relaciones
    proyectos: Mapped[list["Proyecto"]] = relationship(
        "Proyecto", back_populates="socioformador"
    )
    usuarios: Mapped[list["Usuario"]] = relationship(
        "Usuario", back_populates="socioformador"
    )
