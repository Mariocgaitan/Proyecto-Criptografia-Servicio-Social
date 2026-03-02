"""add lista_espera table

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-03-02 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'lista_espera',
        sa.Column('id_espera', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('id_matricula', sa.String(length=20), nullable=False),
        sa.Column('id_proyecto', sa.Integer(), nullable=False),
        sa.Column('id_evento', sa.Integer(), nullable=False),
        sa.Column(
            'timestamp_registro',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(['id_matricula'], ['usuarios.id_matricula'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['id_proyecto'],  ['proyectos.id_proyecto'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['id_evento'],    ['eventos.id_evento'],     ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id_espera'),
        sa.UniqueConstraint('id_matricula', 'id_proyecto', name='uq_espera_alumno_proyecto'),
    )

    # Índices para búsquedas frecuentes
    op.create_index(
        'idx_espera_proyecto_tiempo',
        'lista_espera',
        ['id_proyecto', 'timestamp_registro'],
    )
    op.create_index(
        'idx_espera_alumno_evento',
        'lista_espera',
        ['id_matricula', 'id_evento'],
    )


def downgrade() -> None:
    op.drop_index('idx_espera_alumno_evento',    table_name='lista_espera')
    op.drop_index('idx_espera_proyecto_tiempo',  table_name='lista_espera')
    op.drop_table('lista_espera')
