"""unify empresa users to one per company

Revision ID: d6e7f8a9b0c1
Revises: c4e5f6a7b8c9
Create Date: 2026-03-17 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d6e7f8a9b0c1"
down_revision: Union[str, None] = "c4e5f6a7b8c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("usuarios", sa.Column("id_empresa", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_usuarios_id_empresa_empresas",
        "usuarios",
        "empresas",
        ["id_empresa"],
        ["id_empresa"],
        ondelete="SET NULL",
    )

    # Backfill: usuarios empresa históricos estaban ligados por id_proyecto.
    op.execute(
        """
        UPDATE usuarios AS u
        SET id_empresa = p.id_empresa
        FROM proyectos AS p
        WHERE u.rol = 'empresa'
          AND u.id_proyecto = p.id_proyecto
          AND u.id_empresa IS NULL
        """
    )

    # Consolidación: dejar un solo usuario empresa por id_empresa.
    op.execute(
        """
        WITH ranked AS (
            SELECT
                id_matricula,
                ROW_NUMBER() OVER (
                    PARTITION BY id_empresa
                    ORDER BY created_at ASC NULLS LAST, id_matricula ASC
                ) AS rn
            FROM usuarios
            WHERE rol = 'empresa'
              AND id_empresa IS NOT NULL
        )
        DELETE FROM usuarios u
        USING ranked r
        WHERE u.id_matricula = r.id_matricula
          AND r.rn > 1
        """
    )

    # Garantiza una sola cuenta empresa por empresa.
    op.create_index(
        "uq_usuarios_empresa_por_empresa",
        "usuarios",
        ["id_empresa"],
        unique=True,
        postgresql_where=sa.text("rol = 'empresa' AND id_empresa IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_usuarios_empresa_por_empresa", table_name="usuarios")
    op.drop_constraint("fk_usuarios_id_empresa_empresas", "usuarios", type_="foreignkey")
    op.drop_column("usuarios", "id_empresa")
