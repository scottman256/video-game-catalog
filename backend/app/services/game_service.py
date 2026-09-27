from sqlalchemy.orm import Session

from app.models.game import Game
from app.models.user import User
from app.repositories.game_repository import GameRepository
from app.repositories.system_repository import SystemRepository
from app.services.exceptions import SystemNotFoundError


def is_game_visible_to(game: Game, user: User) -> bool:
    """Pending games are hidden from everyone except the submitter and admins."""
    return game.is_approved or user.is_admin or game.created_by_user_id == user.id


def can_manage_game_images(game: Game, user: User) -> bool:
    return user.is_admin or game.created_by_user_id == user.id


class GameService:
    def __init__(self, db: Session) -> None:
        self._games = GameRepository(db)
        self._systems = SystemRepository(db)

    def search(self, query: str, viewer: User) -> list[Game]:
        return self._games.search_by_title(query, None if viewer.is_admin else viewer.id)

    def get_visible(self, game_id: int, viewer: User) -> Game | None:
        game = self._games.get_by_id(game_id)
        return game if game and is_game_visible_to(game, viewer) else None

    def create_game(
        self,
        title: str,
        summary: str | None,
        release_year: int,
        system_id: int,
        esrb_rating: str,
        creator: User,
    ) -> Game:
        self.ensure_system_exists(system_id)
        return self._games.create(
            title, summary, release_year, system_id, esrb_rating, creator.id, is_approved=creator.is_admin
        )

    def ensure_system_exists(self, system_id: int) -> None:
        if not self._systems.exists(system_id):
            raise SystemNotFoundError(f"System {system_id} does not exist")
