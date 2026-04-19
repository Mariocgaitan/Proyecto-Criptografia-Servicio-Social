"""Drop plaintext nonce column from google_nonces — only hash is needed"""
from alembic import op
from sqlalchemy import inspect
from typing import Sequence, Union

revision = "i2b3c4d5e6f7"
down_revision = "h1a2b3c4d5e6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    if "google_nonces" in inspector.get_table_names():
        columns = [c["name"] for c in inspector.get_columns("google_nonces")]
        indexes = [idx["name"] for idx in inspector.get_indexes("google_nonces")]
        
        # Solo eliminar el índice si existe
        if "ix_google_nonces_nonce" in indexes:
            op.drop_index("ix_google_nonces_nonce", table_name="google_nonces")
        
        # Solo eliminar la columna si existe
        if "nonce" in columns:
            op.drop_column("google_nonces", "nonce")


def downgrade() -> None:
    import sqlalchemy as sa

    bind = op.get_bind()
    inspector = inspect(bind)

    if "google_nonces" in inspector.get_table_names():
        columns = [c["name"] for c in inspector.get_columns("google_nonces")]
        if "nonce" not in columns:
            op.add_column("google_nonces", sa.Column("nonce", sa.String(36), nullable=True))
