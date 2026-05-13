"""Add iniciado/fecha_inicio_real to eventos and es_participante to usuario_eventos

Revision ID: k4d5e6f7a8b9
Revises: j3c4d5e6f7a8
Create Date: 2026-05-13 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "k4d5e6f7a8b9"
down_revision: Union[str, Sequence[str], None] = "j3c4d5e6f7a8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "eventos",
        sa.Column("iniciado", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "eventos",
        sa.Column("fecha_inicio_real", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "usuario_eventos",
        sa.Column(
            "es_participante",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )


def downgrade() -> None:
    op.drop_column("usuario_eventos", "es_participante")
    op.drop_column("eventos", "fecha_inicio_real")
    op.drop_column("eventos", "iniciado")
