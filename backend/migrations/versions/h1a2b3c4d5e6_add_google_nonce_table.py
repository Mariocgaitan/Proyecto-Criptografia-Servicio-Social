"""Add google_nonces table for OAuth replay attack prevention"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect
from typing import Sequence, Union


revision = "h1a2b3c4d5e6"
down_revision: Union[str, Sequence[str], None] = ("10f28c2be4bb", "662c48ea5072")
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    tables = inspector.get_table_names()

    # Crear tabla google_nonces solo si no existe
    if 'google_nonces' not in tables:
        op.create_table(
            'google_nonces',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('nonce', sa.String(36), nullable=False),
            sa.Column('nonce_hash', sa.String(64), nullable=False),
            sa.Column('expira_en', sa.DateTime(timezone=True), nullable=False),
            sa.Column('usado', sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('nonce'),
            sa.UniqueConstraint('nonce_hash'),
        )
        op.create_index(op.f('ix_google_nonces_nonce'), 'google_nonces', ['nonce'], unique=True)
        op.create_index(op.f('ix_google_nonces_nonce_hash'), 'google_nonces', ['nonce_hash'], unique=True)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    tables = inspector.get_table_names()

    if 'google_nonces' in tables:
        op.drop_table('google_nonces')
