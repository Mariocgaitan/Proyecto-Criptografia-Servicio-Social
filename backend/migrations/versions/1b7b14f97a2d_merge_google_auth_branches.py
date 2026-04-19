"""Generic script.py.mako template for Alembic migrations."""
"""merge_google_auth_branches

Revision ID: 1b7b14f97a2d
Revises: de8fdd8c3c98, g0a1b2c3d4e5
Create Date: 2026-03-26 19:14:41.545596

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1b7b14f97a2d'
down_revision: Union[str, None] = ('de8fdd8c3c98', 'g0a1b2c3d4e5')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
