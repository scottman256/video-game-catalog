from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload

from app.models.game import Game

_DETAILS = (joinedload(Game.system), joinedload(Game.images), joinedload(Game.created_by))


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
        is_approved: bool = True,
    ) -> Game:
        game = Game(
            title=title,
            summary=summary,
            release_year=release_year,
            system_id=system_id,
            esrb_rating=esrb_rating,
            created_by_user_id=created_by_user_id,
            is_approved=is_approved,
        )
        self._db.add(game)
        self._db.flush()
        return game

    def get_by_id(self, game_id: int) -> Game | None:
        return self._db.scalar(select(Game).options(*_DETAILS).where(Game.id == game_id))

    def search_by_title(self, query: str, visible_to_user_id: int | None = None) -> list[Game]:
        """With `visible_to_user_id`, pending games are only included if that user submitted them."""
        stmt = select(Game).options(*_DETAILS).where(Game.title.ilike(f"%{query}%")).order_by(Game.title)
        if visible_to_user_id is not None:
            stmt = stmt.where(or_(Game.is_approved.is_(True), Game.created_by_user_id == visible_to_user_id))
        return list(self._db.scalars(stmt).unique())

    def list_all(self, query: str, is_approved: bool | None) -> list[Game]:
        stmt = select(Game).options(*_DETAILS).where(Game.title.ilike(f"%{query}%")).order_by(Game.title)
        if is_approved is not None:
            stmt = stmt.where(Game.is_approved.is_(is_approved))
        return list(self._db.scalars(stmt).unique())

    def list_pending_oldest_first(self) -> list[Game]:
        stmt = select(Game).options(*_DETAILS).where(Game.is_approved.is_(False)).order_by(Game.created_at, Game.id)
        return list(self._db.scalars(stmt).unique())

    def update(self, game: Game, changes: dict) -> Game:
        for field, value in changes.items():
            setattr(game, field, value)
        self._db.flush()
        self._db.refresh(game)
        return game

    def delete(self, game: Game) -> None:
        self._db.delete(game)
        self._db.flush()

    def approve(self, game: Game) -> Game:
        game.is_approved = True
        self._db.flush()
        return game
