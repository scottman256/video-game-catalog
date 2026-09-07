from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.game import Game


class GameRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def create(
        self,
        title: str,
        summary: str | None,
        release_year: int,
        system_id: int,
        esrb_rating: str,
        created_by_user_id: int,
    ) -> Game:
        game = Game(
            title=title,
            summary=summary,
            release_year=release_year,
            system_id=system_id,
            esrb_rating=esrb_rating,
            created_by_user_id=created_by_user_id,
        )
        self._db.add(game)
        self._db.flush()
        return game

    def get_by_id(self, game_id: int) -> Game | None:
        stmt = select(Game).options(joinedload(Game.system), joinedload(Game.images)).where(Game.id == game_id)
        return self._db.scalar(stmt)

    def search_by_title(self, query: str) -> list[Game]:
        stmt = (
            select(Game)
            .options(joinedload(Game.system), joinedload(Game.images))
            .where(Game.title.ilike(f"%{query}%"))
            .order_by(Game.title)
        )
        return list(self._db.scalars(stmt).unique())
