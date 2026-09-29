from decimal import Decimal

from sqlalchemy import delete, select
from sqlalchemy.orm import Session, joinedload

from app.models.game import Game
from app.models.user_game_wishlist import UserGameWishlist

_EAGER_LOAD = joinedload(UserGameWishlist.game).joinedload(Game.system)


class WishlistRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def create(self, user_id: int, game_id: int, target_price: Decimal | None) -> UserGameWishlist:
        entry = UserGameWishlist(user_id=user_id, game_id=game_id, target_price=target_price)
        self._db.add(entry)
        self._db.flush()
        return entry

    def get_by_id(self, wishlist_id: int) -> UserGameWishlist | None:
        stmt = select(UserGameWishlist).options(_EAGER_LOAD).where(UserGameWishlist.id == wishlist_id)
        return self._db.scalar(stmt)

    def get_by_user_and_game(self, user_id: int, game_id: int) -> UserGameWishlist | None:
        stmt = select(UserGameWishlist).where(
            UserGameWishlist.user_id == user_id, UserGameWishlist.game_id == game_id
        )
        return self._db.scalar(stmt)

    def list_for_user(self, user_id: int) -> list[UserGameWishlist]:
        stmt = select(UserGameWishlist).options(_EAGER_LOAD).where(UserGameWishlist.user_id == user_id)
        return list(self._db.scalars(stmt).unique())

    def list_game_ids_for_user(self, user_id: int) -> set[int]:
        stmt = select(UserGameWishlist.game_id).where(UserGameWishlist.user_id == user_id)
        return set(self._db.scalars(stmt))

    def update_target_price(self, entry: UserGameWishlist, target_price: Decimal | None) -> UserGameWishlist:
        entry.target_price = target_price
        self._db.flush()
        return entry

    def delete(self, entry: UserGameWishlist) -> None:
        self._db.delete(entry)
        self._db.flush()

    def delete_for_game(self, game_id: int) -> None:
        self._db.execute(delete(UserGameWishlist).where(UserGameWishlist.game_id == game_id))
