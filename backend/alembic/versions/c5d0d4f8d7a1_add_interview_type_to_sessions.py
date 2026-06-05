"""add interview_type to interview sessions

Revision ID: c5d0d4f8d7a1
Revises: 84147fc07762
Create Date: 2026-05-24 00:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "c5d0d4f8d7a1"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col["name"] for col in inspector.get_columns("interview_sessions")]
    if "interview_type" not in columns:
        op.add_column(
            "interview_sessions",
            sa.Column(
                "interview_type",
                sa.String(length=50),
                server_default="text",
                nullable=False,
            ),
        )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col["name"] for col in inspector.get_columns("interview_sessions")]
    if "interview_type" in columns:
        op.drop_column("interview_sessions", "interview_type")
