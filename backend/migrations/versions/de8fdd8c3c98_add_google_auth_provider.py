"""add_google_auth_provider

Revision ID: de8fdd8c3c98
Revises: g0a1b2c3d4e5
Create Date: 2026-03-26 18:33:51.323062

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = 'de8fdd8c3c98'
down_revision: Union[str, None] = 'g0a1b2c3d4e5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Migración segura, corre DESPUÉS de g0a1b2c3d4e5
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [c['name'] for c in inspector.get_columns('usuarios')]

    # Agregar auth_provider si no existe
    if 'auth_provider' not in columns:
        op.add_column('usuarios', sa.Column('auth_provider', sa.String(length=50), server_default='local', nullable=False))

    # Borrar is_google_login (fue creada por g0a1b2c3d4e5, ahora la reemplazamos con auth_provider)
    if 'is_google_login' in columns:
        op.drop_column('usuarios', 'is_google_login')


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [c['name'] for c in inspector.get_columns('usuarios')]

    if 'is_google_login' not in columns:
        op.add_column('usuarios', sa.Column('is_google_login', sa.Boolean(), server_default=sa.false(), nullable=False))

    if 'auth_provider' in columns:
        op.drop_column('usuarios', 'auth_provider')
