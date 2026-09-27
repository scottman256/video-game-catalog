from sqlalchemy.orm import Session

from app.models.game import Game
from app.repositories.game_repository import GameRepository
from app.services.exceptions import GameNotFoundError
from app.services.game_service import GameService

_NULLABLE_FIELDS = {"summary"}


class AdminGameService:
    """Full edit rights over the global catalog, including games awaiting approval."""

    def __init__(self, db: Session) -> None:
        self._games = GameRepository(db)
        self._game_service = GameService(db)

    def list_games(self, query: str, is_approved: bool | None) -> list[Game]:
        return self._games.list_all(query, is_approved)

    def list_pending(self) -> list[Game]:
        return self._games.list_pending_oldest_first()

    def get_game(self, game_id: int) -> Game:
        game = self._games.get_by_id(game_id)
        if not game:
            raise GameNotFoundError(f"Game {game_id} does not exist")
        return game

    def update_game(self, game_id: int, changes: dict) -> Game:
        game = self.get_game(game_id)
        applicable = _without_cleared_required_fields(changes)
        if "system_id" in applicable:
            self._game_service.ensure_system_exists(applicable["system_id"])
        return self._games.update(game, applicable)

    def approve_game(self, game_id: int, changes: dict) -> Game:
        """Saves any pending edits and approves in the same transaction."""
        game = self.update_game(game_id, changes)
        return self._games.approve(game)


def _without_cleared_required_fields(changes: dict) -> dict:
    return {field: value for field, value in changes.items() if value is not None or field in _NULLABLE_FIELDS}
