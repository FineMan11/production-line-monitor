"""add layout_configs table

Revision ID: b2c3d4e5f6a1
Revises: a1b2c3d4e5f6
Create Date: 2026-04-26 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'b2c3d4e5f6a1'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'layout_configs',
        sa.Column('id',          sa.Integer(),     nullable=False),
        sa.Column('section_key', sa.String(30),    nullable=False),
        sa.Column('layout',      sa.Text(),         nullable=False, server_default='[]'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_layout_configs_section_key', 'layout_configs', ['section_key'], unique=True)


def downgrade():
    op.drop_index('ix_layout_configs_section_key', table_name='layout_configs')
    op.drop_table('layout_configs')
