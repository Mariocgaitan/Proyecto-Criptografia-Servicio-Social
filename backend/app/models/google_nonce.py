from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class GoogleNonce(Base):
    """
    Almacena nonces (once-use values) para Google OAuth.
    Previene ataques de replay al validar que el nonce en el id_token
    coincide con uno generado previamente y no ha sido usado.

    TTL: 5 minutos (típicamente el id_token tiene TTL de 1 hora, pero nosotros
    queremos reutilizar el nonce generado en el cliente dentro de 5 min).
    """
    __tablename__ = "google_nonces"

    id: Mapped[int] = mapped_column(primary_key=True)
    # Legacy column — DB still has NOT NULL; keep in model to avoid insert failures
    nonce: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, default="")
    nonce_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    expira_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    usado: Mapped[bool] = mapped_column(default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
