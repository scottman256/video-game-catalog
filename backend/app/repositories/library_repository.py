from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.models.game import Game
from app.models.user_game_library import UserGameLibrary

_EAGER_LOAD = (joinedload(UserGameLibrary.game).joinedload(Game.system), joinedload(UserGameLibrary.review))


class LibraryRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def create(
        self, user_id: int, game_id: int, ownership_type: str, price_paid: Decimal | None
    ) -> UserGameLibrary:
        entry = UserGameLibrary(user_id=user_id, game_id=game_id, ownership_type=ownership_type, price_paid=price_paid)
        self._db.add(entry)
        self._db.flush()
        return entry

    def get_by_id(self, library_id: int) -> UserGameLibrary | None:
        stmt = select(UserGameLibrary).options(*_EAGER_LOAD).where(UserGameLibrary.id == library_id)
        return self._db.scalar(stmt)

    def get_by_user_and_game(self, user_id: int, game_id: int) -> UserGameLibrary | None:
        stmt = select(UserGameLibrary).where(
            UserGameLibrary.user_id == user_id, UserGameLibrary.game_id == game_id
        )
        return self._db.scalar(stmt)

    def list_for_user(self, user_id: int) -> list[UserGameLibrary]:
        stmt = select(UserGameLibrary).options(*_EAGER_LOAD).where(UserGameLibrary.user_id == user_id)
        return list(self._db.scalars(stmt).unique())

    def list_game_ids_for_user(self, user_id: int) -> set[int]:
        stmt = select(UserGameLibrary.game_id).where(UserGameLibrary.user_id == user_id)
        return set(self._db.scalars(stmt))

    def count_for_user(self, user_id: int) -> int:
        stmt = select(func.count()).select_from(UserGameLibrary).where(UserGameLibrary.user_id == user_id)
        return self._db.scalar(stmt) or 0

    def count_distinct_systems_for_user(self, user_id: int) -> int:
        stmt = (
            select(func.count(func.distinct(Game.system_id)))
            .select_from(UserGameLibrary)
            .join(Game, Game.id == UserGameLibrary.game_id)
            .where(UserGameLibrary.user_id == user_id)
        )
        return self._db.scalar(stmt) or 0

    def update(
        self, entry: UserGameLibrary, ownership_type: str | None, price_paid: Decimal | None
    ) -> UserGameLibrary:
        if ownership_type is not None:
            entry.ownership_type = ownership_type
        if price_paid is not None:
            entry.price_paid = price_paid
        self._db.flush()
        return entry

    def delete(self, entry: UserGameLibrary) -> None:
        self._db.delete(entry)
        self._db.flush()
