from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class TempTotpSecret(Base):
    """
    Almacena temporalmente el secreto TOTP durante el registro de Google OAuth.
    Reemplaza el enfoque anterior de embeber el secreto en un JWT.
    """
    __tablename__ = "temp_totp_secrets"

    id: Mapped[int] = mapped_column(primary_key=True)
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    correo: Mapped[str] = mapped_column(String(200), nullable=False)
    nombre: Mapped[str] = mapped_column(String(200), nullable=False)
    totp_secret: Mapped[str] = mapped_column(String(64), nullable=False)
    expira_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    usado: Mapped[bool] = mapped_column(default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
