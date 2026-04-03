"""Generic script.py.mako template for Alembic migrations."""
"""add_security_fields_and_temp_totp_table

Revision ID: 662c48ea5072
Revises: 10f28c2be4bb
Create Date: 2026-04-03 11:01:31.990152

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '662c48ea5072'
down_revision: Union[str, None] = '10f28c2be4bb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Tabla temporal para secretos TOTP durante registro Google OAuth
    op.create_table('temp_totp_secrets',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('token_hash', sa.String(length=64), nullable=False),
    sa.Column('correo', sa.String(length=200), nullable=False),
    sa.Column('nombre', sa.String(length=200), nullable=False),
    sa.Column('totp_secret', sa.String(length=64), nullable=False),
    sa.Column('expira_en', sa.DateTime(timezone=True), nullable=False),
    sa.Column('usado', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_temp_totp_secrets_token_hash'), 'temp_totp_secrets', ['token_hash'], unique=True)

    # Campos de seguridad en usuarios
    op.add_column('usuarios', sa.Column('failed_login_attempts', sa.Integer(), server_default='0', nullable=False))
    op.add_column('usuarios', sa.Column('locked_until', sa.DateTime(timezone=True), nullable=True))
    op.add_column('usuarios', sa.Column('last_totp_used_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('usuarios', 'last_totp_used_at')
    op.drop_column('usuarios', 'locked_until')
    op.drop_column('usuarios', 'failed_login_attempts')
    op.drop_index(op.f('ix_temp_totp_secrets_token_hash'), table_name='temp_totp_secrets')
    op.drop_table('temp_totp_secrets')
