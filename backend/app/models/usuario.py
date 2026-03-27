from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Usuario(Base):
    """
    Representa a un usuario del sistema (alumno, empresa o admin).
    """
    __tablename__ = "usuarios"

    id_matricula: Mapped[str] = mapped_column(String(20), primary_key=True)
    nombre: Mapped[str] = mapped_column(String(200), nullable=False)
    correo: Mapped[str] = mapped_column(String(200), nullable=False, unique=True)
    carrera: Mapped[str] = mapped_column(String(100), nullable=False)
    semestre: Mapped[int] = mapped_column(Integer, nullable=False)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_google_login: Mapped[bool] = mapped_column(default=False, nullable=False)
    totp_secret: Mapped[str] = mapped_column(String(64), nullable=False)
    rol: Mapped[str] = mapped_column(String(20), nullable=False, server_default="alumno")
    id_empresa: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("empresas.id_empresa", ondelete="SET NULL"), nullable=True
    )
    id_proyecto: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("proyectos.id_proyecto", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relaciones
    usuario_eventos: Mapped[list["UsuarioEvento"]] = relationship(
        "UsuarioEvento", back_populates="usuario", cascade="all, delete-orphan"
    )
    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(
        "RefreshToken", back_populates="usuario", cascade="all, delete-orphan"
    )
    inscripciones: Mapped[list["Inscripcion"]] = relationship(
        "Inscripcion", back_populates="usuario"
    )
    empresa: Mapped["Empresa | None"] = relationship("Empresa", back_populates="usuarios")
