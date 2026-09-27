from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models.user_game_library import UserGameLibrary
from app.models.user_game_review import UserGameReview


class ReviewRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def get_by_library_id(self, user_library_id: int) -> UserGameReview | None:
        stmt = select(UserGameReview).where(UserGameReview.user_library_id == user_library_id)
        return self._db.scalar(stmt)

    def upsert(self, user_library_id: int, scores: dict[str, int | None]) -> UserGameReview:
        review = self.get_by_library_id(user_library_id)
        if review is None:
            review = UserGameReview(user_library_id=user_library_id)
            self._db.add(review)
        for field, value in scores.items():
            setattr(review, field, value)
        self._db.flush()
        return review

    def list_for_user(self, user_id: int) -> list[UserGameReview]:
        stmt = (
            select(UserGameReview)
            .join(UserGameLibrary, UserGameLibrary.id == UserGameReview.user_library_id)
            .where(UserGameLibrary.user_id == user_id)
        )
        return list(self._db.scalars(stmt))

    def delete_for_game(self, game_id: int) -> None:
        library_ids_for_game = select(UserGameLibrary.id).where(UserGameLibrary.game_id == game_id)
        self._db.execute(delete(UserGameReview).where(UserGameReview.user_library_id.in_(library_ids_for_game)))

    def list_for_game(self, game_id: int) -> list[UserGameReview]:
        stmt = (
            select(UserGameReview)
            .join(UserGameLibrary, UserGameLibrary.id == UserGameReview.user_library_id)
            .where(UserGameLibrary.game_id == game_id)
        )
        return list(self._db.scalars(stmt))
