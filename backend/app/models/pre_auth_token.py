from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class PreAuthToken(Base):
    """
    Token temporal generado después de validar contraseña/Google y antes de validar TOTP.
    Se usa para garantizar que el usuario debe pasar 2FA antes de recibir el token final.
    """
    __tablename__ = "pre_auth_tokens"

    id: Mapped[int] = mapped_column(primary_key=True)
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    id_matricula: Mapped[str] = mapped_column(
        String(20), ForeignKey("usuarios.id_matricula", ondelete="CASCADE"), nullable=False
    )
    expira_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    usado: Mapped[bool] = mapped_column(default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relación
    usuario: Mapped["Usuario"] = relationship("Usuario")
