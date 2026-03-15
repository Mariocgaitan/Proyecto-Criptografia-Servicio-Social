"""Add carrera and semestre to padron_alumnos

Revision ID: c4e5f6a7b8c9
Revises: be72d86f3683, b2c3d4e5f6a7
Create Date: 2026-03-14 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c4e5f6a7b8c9"
down_revision: Union[str, Sequence[str], None] = ("be72d86f3683", "b2c3d4e5f6a7")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("padron_alumnos", sa.Column("carrera", sa.String(length=10), nullable=True))
    op.add_column("padron_alumnos", sa.Column("semestre", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("padron_alumnos", "semestre")
    op.drop_column("padron_alumnos", "carrera")
