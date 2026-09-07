from sqlalchemy.orm import Session

from app.models.game import Game
from app.repositories.game_repository import GameRepository


class GameService:
    def __init__(self, db: Session) -> None:
        self._games = GameRepository(db)

    def search(self, query: str) -> list[Game]:
        return self._games.search_by_title(query)

    def get_by_id(self, game_id: int) -> Game | None:
        return self._games.get_by_id(game_id)

    def create_game(
        self,
        title: str,
        summary: str | None,
        release_year: int,
        system_id: int,
        esrb_rating: str,
        created_by_user_id: int,
    ) -> Game:
        return self._games.create(title, summary, release_year, system_id, esrb_rating, created_by_user_id)
