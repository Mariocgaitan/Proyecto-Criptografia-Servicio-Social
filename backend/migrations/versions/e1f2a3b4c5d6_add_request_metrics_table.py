"""add_request_metrics_table

Revision ID: e1f2a3b4c5d6
Revises: d6e7f8a9b0c1
Create Date: 2026-03-19 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "e1f2a3b4c5d6"
down_revision: Union[str, Sequence[str], None] = "d6e7f8a9b0c1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "request_metrics",
        sa.Column("id_metric", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("request_timestamp", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("endpoint", sa.String(length=255), nullable=False),
        sa.Column("method", sa.String(length=16), nullable=False),
        sa.Column("status_code", sa.Integer(), nullable=False),
        sa.Column("duration_ms", sa.Float(), nullable=False),
        sa.PrimaryKeyConstraint("id_metric"),
    )
    op.create_index(op.f("ix_request_metrics_request_timestamp"), "request_metrics", ["request_timestamp"], unique=False)
    op.create_index(op.f("ix_request_metrics_endpoint"), "request_metrics", ["endpoint"], unique=False)
    op.create_index(op.f("ix_request_metrics_status_code"), "request_metrics", ["status_code"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_request_metrics_status_code"), table_name="request_metrics")
    op.drop_index(op.f("ix_request_metrics_endpoint"), table_name="request_metrics")
    op.drop_index(op.f("ix_request_metrics_request_timestamp"), table_name="request_metrics")
    op.drop_table("request_metrics")
