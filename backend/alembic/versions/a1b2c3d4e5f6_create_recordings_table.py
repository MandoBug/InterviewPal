"""create recordings table

Revision ID: a1b2c3d4e5f6
Revises: 84147fc07762
Create Date: 2026-05-02 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'a1b2c3d4e5f6'
down_revision = '84147fc07762'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'recordings',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('session_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('interview_sessions.id'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('question_index', sa.Integer(), nullable=False),
        sa.Column('question_text', sa.String(1000), nullable=False),
        sa.Column('filename', sa.String(500), nullable=False),
        sa.Column('duration_seconds', sa.Integer(), default=0),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_recordings_session_id', 'recordings', ['session_id'])
    op.create_index('ix_recordings_user_id', 'recordings', ['user_id'])


def downgrade() -> None:
    op.drop_index('ix_recordings_user_id', table_name='recordings')
    op.drop_index('ix_recordings_session_id', table_name='recordings')
    op.drop_table('recordings')
