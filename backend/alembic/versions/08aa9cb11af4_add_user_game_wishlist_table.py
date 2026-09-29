"""add user game wishlist table

Revision ID: 08aa9cb11af4
Revises: 60beed0891d8
Create Date: 2026-09-28 20:42:50.608666

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '08aa9cb11af4'
down_revision: Union[str, Sequence[str], None] = '60beed0891d8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('user_game_wishlist',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('game_id', sa.Integer(), nullable=False),
    sa.Column('target_price', sa.Numeric(precision=10, scale=2), nullable=True),
    sa.Column('added_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.ForeignKeyConstraint(['game_id'], ['games.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id', 'game_id', name='uq_user_game_wishlist_user_game')
    )
    op.create_index(op.f('ix_user_game_wishlist_game_id'), 'user_game_wishlist', ['game_id'], unique=False)
    op.create_index(op.f('ix_user_game_wishlist_user_id'), 'user_game_wishlist', ['user_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_user_game_wishlist_user_id'), table_name='user_game_wishlist')
    op.drop_index(op.f('ix_user_game_wishlist_game_id'), table_name='user_game_wishlist')
    op.drop_table('user_game_wishlist')
