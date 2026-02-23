import uuid
from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class LogAuditoria(Base):
    """
    Registra todos los eventos de seguridad del sistema.
    """
    __tablename__ = "logs_auditoria"

    id_log: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    tipo_evento: Mapped[str] = mapped_column(
        String(50), nullable=False,
        comment="LOGIN_EXITOSO | LOGIN_FALLIDO | REGISTRO_NUEVO | LOGOUT | TOKEN_INVALIDO | ..."
    )
    id_matricula: Mapped[str | None] = mapped_column(String(20), nullable=True)
    ip_origen: Mapped[str | None] = mapped_column(String(45), nullable=True)
    detalle: Mapped[str | None] = mapped_column(Text, nullable=True)
