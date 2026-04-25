"""add bay column and rename plant 2 to plant 3

Revision ID: a1b2c3d4e5f6
Revises: 0c9cb2a69737
Create Date: 2026-04-25 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = '0c9cb2a69737'
branch_labels = None
depends_on = None


def upgrade():
    # Add bay column (nullable — Plant 1 testers stay null)
    op.add_column('testers', sa.Column('bay', sa.Integer(), nullable=True))

    # Rename Plant 2 → Plant 3 (no Plant 2 exists on the actual factory floor)
    op.execute("UPDATE testers SET plant = 3 WHERE plant = 2")

    # Assign bay values for Plant 3 stations based on station_number ranges
    op.execute("UPDATE testers SET bay = 1 WHERE plant = 3 AND station_number BETWEEN 1 AND 14")
    op.execute("UPDATE testers SET bay = 2 WHERE plant = 3 AND station_number BETWEEN 15 AND 28")
    op.execute("UPDATE testers SET bay = 3 WHERE plant = 3 AND station_number >= 29")


def downgrade():
    # Revert bay assignments and plant rename
    op.execute("UPDATE testers SET bay = NULL WHERE plant = 3")
    op.execute("UPDATE testers SET plant = 2 WHERE plant = 3")
    op.drop_column('testers', 'bay')
