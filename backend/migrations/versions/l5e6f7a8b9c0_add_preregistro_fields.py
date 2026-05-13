"""Add preregistro_abierto to eventos and preregistrado to usuario_eventos

Revision ID: l5e6f7a8b9c0
Revises: k4d5e6f7a8b9
Create Date: 2026-05-13 12:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "l5e6f7a8b9c0"
down_revision: Union[str, Sequence[str], None] = "k4d5e6f7a8b9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # eventos: ventana de pre-registro abierta por defecto
    op.add_column(
        "eventos",
        sa.Column(
            "preregistro_abierto",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
            comment="Mientras True, los alumnos que se loguean quedan como pre-registrados",
        ),
    )

    # usuario_eventos: indica si el alumno llegó dentro de la ventana de pre-registro
    op.add_column(
        "usuario_eventos",
        sa.Column(
            "preregistrado",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
            comment="True si el alumno se registro mientras preregistro_abierto estaba activo",
        ),
    )


def downgrade() -> None:
    op.drop_column("usuario_eventos", "preregistrado")
    op.drop_column("eventos", "preregistro_abierto")
