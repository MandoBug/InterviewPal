"""add password_updated_at to users

Revision ID: d6e7f8a9b0c1
Revises: c5d0d4f8d7a1
Create Date: 2026-06-07 01:15:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "d6e7f8a9b0c1"
down_revision: Union[str, None] = "c5d0d4f8d7a1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col["name"] for col in inspector.get_columns("users")]
    if "password_updated_at" not in columns:
        op.add_column(
            "users",
            sa.Column("password_updated_at", sa.DateTime(timezone=True), nullable=True),
        )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col["name"] for col in inspector.get_columns("users")]
    if "password_updated_at" in columns:
        op.drop_column("users", "password_updated_at")
