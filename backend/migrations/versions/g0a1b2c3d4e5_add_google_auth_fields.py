"""Add Google auth fields and pre_auth_tokens table"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "g0a1b2c3d4e5"
down_revision = "e1f2a3b4c5d6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [c['name'] for c in inspector.get_columns('usuarios')]
    tables = inspector.get_table_names()

    # Agregar is_google_login solo si no existe
    if 'is_google_login' not in columns:
        op.add_column('usuarios', sa.Column('is_google_login', sa.Boolean(), nullable=False, server_default=sa.false()))

    # Hacer nullable password_hash si es necesario
    op.alter_column('usuarios', 'password_hash',
               existing_type=sa.String(255),
               nullable=True)

    # Crear tabla pre_auth_tokens solo si no existe
    if 'pre_auth_tokens' not in tables:
        op.create_table(
            'pre_auth_tokens',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('token_hash', sa.String(64), nullable=False),
            sa.Column('id_matricula', sa.String(20), nullable=False),
            sa.Column('expira_en', sa.DateTime(timezone=True), nullable=False),
            sa.Column('usado', sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(['id_matricula'], ['usuarios.id_matricula'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('token_hash'),
        )
        op.create_index(op.f('ix_pre_auth_tokens_token_hash'), 'pre_auth_tokens', ['token_hash'], unique=True)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    tables = inspector.get_table_names()

    if 'pre_auth_tokens' in tables:
        op.drop_index(op.f('ix_pre_auth_tokens_token_hash'), table_name='pre_auth_tokens')
        op.drop_table('pre_auth_tokens')

    op.alter_column('usuarios', 'password_hash',
               existing_type=sa.String(255),
               nullable=False)
    op.drop_column('usuarios', 'is_google_login')
