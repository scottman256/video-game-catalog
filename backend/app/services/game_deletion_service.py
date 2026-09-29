from sqlalchemy.orm import Session

from app.repositories.game_repository import GameRepository
from app.repositories.library_repository import LibraryRepository
from app.repositories.review_repository import ReviewRepository
from app.repositories.wishlist_repository import WishlistRepository
from app.services.exceptions import GameNotFoundError
from app.services.game_image_service import GameImageService
from app.storage.base import StorageBackend


class GameDeletionService:
    """Permanently removes a game from the global catalog, along with everything that depends on it."""

    def __init__(self, db: Session, storage: StorageBackend) -> None:
        self._games = GameRepository(db)
        self._library = LibraryRepository(db)
        self._reviews = ReviewRepository(db)
        self._wishlist = WishlistRepository(db)
        self._images = GameImageService(db, storage)

    def delete_game(self, game_id: int) -> None:
        game = self._games.get_by_id(game_id)
        if not game:
            raise GameNotFoundError(f"Game {game_id} does not exist")
        self._reviews.delete_for_game(game_id)
        self._library.delete_for_game(game_id)
        self._wishlist.delete_for_game(game_id)
        self._images.delete_all_images(game_id)
        self._games.delete(game)
