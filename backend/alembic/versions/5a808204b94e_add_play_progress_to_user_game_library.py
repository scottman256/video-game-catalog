"""add play progress to user game library

Revision ID: 5a808204b94e
Revises: 08aa9cb11af4
Create Date: 2026-09-28 22:50:06.907423

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5a808204b94e'
down_revision: Union[str, Sequence[str], None] = '08aa9cb11af4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('user_game_library', sa.Column('completed_on', sa.Date(), nullable=True))
    op.add_column('user_game_library', sa.Column('fully_completed_on', sa.Date(), nullable=True))
    op.add_column('user_game_library', sa.Column('hours_played', sa.Numeric(precision=7, scale=1), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('user_game_library') as batch_op:
        batch_op.drop_column('hours_played')
        batch_op.drop_column('fully_completed_on')
        batch_op.drop_column('completed_on')
