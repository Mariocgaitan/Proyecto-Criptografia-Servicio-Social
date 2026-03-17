from datetime import datetime

from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Empresa(Base):
    """
    Representa una empresa participante en el evento de vinculación.
    """
    __tablename__ = "empresas"

    id_empresa: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nombre_empresa: Mapped[str] = mapped_column(String(150), nullable=False)
    logo_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relaciones
    proyectos: Mapped[list["Proyecto"]] = relationship(
        "Proyecto", back_populates="empresa"
    )
    usuarios: Mapped[list["Usuario"]] = relationship(
        "Usuario", back_populates="empresa"
    )
