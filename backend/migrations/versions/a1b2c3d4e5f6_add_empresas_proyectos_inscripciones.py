"""add empresas, proyectos, inscripciones tables

Revision ID: a1b2c3d4e5f6
Revises: 02c1c10b5c49
Create Date: 2026-03-02 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '02c1c10b5c49'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Tabla empresas ──────────────────────────────────────────────────────
    op.create_table(
        'empresas',
        sa.Column('id_empresa', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('nombre_empresa', sa.String(length=150), nullable=False),
        sa.Column('logo_url', sa.String(length=255), nullable=True),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint('id_empresa'),
    )

    # ── Tabla proyectos ─────────────────────────────────────────────────────
    op.create_table(
        'proyectos',
        sa.Column('id_proyecto', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('id_empresa', sa.Integer(), nullable=False),
        sa.Column('id_evento', sa.Integer(), nullable=False),
        sa.Column('nombre_proyecto', sa.String(length=200), nullable=False),
        sa.Column('descripcion', sa.Text(), nullable=True),
        sa.Column('capacidad_max', sa.Integer(), nullable=False),
        sa.Column('cupo_actual', sa.Integer(), nullable=False, server_default='0'),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(['id_empresa'], ['empresas.id_empresa'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['id_evento'],  ['eventos.id_evento'],   ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id_proyecto'),
    )

    # ── Tabla inscripciones ─────────────────────────────────────────────────
    op.create_table(
        'inscripciones',
        sa.Column('id_inscripcion', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('id_matricula', sa.String(length=20), nullable=False),
        sa.Column('id_proyecto', sa.Integer(), nullable=False),
        sa.Column('id_evento', sa.Integer(), nullable=False),
        sa.Column(
            'timestamp',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(['id_matricula'], ['usuarios.id_matricula'],   ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['id_proyecto'],  ['proyectos.id_proyecto'],   ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['id_evento'],    ['eventos.id_evento'],       ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id_inscripcion'),
        sa.UniqueConstraint('id_matricula', 'id_evento', name='uq_inscripcion_alumno_evento'),
    )

    # ── Índices recomendados ────────────────────────────────────────────────
    op.create_index('idx_inscripciones_proyecto',      'inscripciones', ['id_proyecto'])
    op.create_index('idx_inscripciones_alumno_evento', 'inscripciones', ['id_matricula', 'id_evento'])
    op.create_index('idx_proyectos_evento',            'proyectos',     ['id_evento'])


def downgrade() -> None:
    op.drop_index('idx_proyectos_evento',            table_name='proyectos')
    op.drop_index('idx_inscripciones_alumno_evento', table_name='inscripciones')
    op.drop_index('idx_inscripciones_proyecto',      table_name='inscripciones')
    op.drop_table('inscripciones')
    op.drop_table('proyectos')
    op.drop_table('empresas')
