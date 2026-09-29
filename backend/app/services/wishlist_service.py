from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.user_game_library import UserGameLibrary
from app.models.user_game_wishlist import UserGameWishlist
from app.repositories.game_repository import GameRepository
from app.repositories.library_repository import LibraryRepository
from app.repositories.wishlist_repository import WishlistRepository
from app.services.exceptions import DuplicateFieldError, GameNotFoundError
from app.services.game_service import is_game_collectible_by
from app.services.library_service import LibraryService


class WishlistService:
    def __init__(self, db: Session) -> None:
        self._wishlist = WishlistRepository(db)
        self._library = LibraryRepository(db)
        self._games = GameRepository(db)
        self._library_service = LibraryService(db)

    def add_to_wishlist(self, user_id: int, game_id: int, target_price: Decimal | None) -> UserGameWishlist:
        if not is_game_collectible_by(self._games.get_by_id(game_id), user_id):
            raise GameNotFoundError(f"Game {game_id} does not exist")
        if self._library.get_by_user_and_game(user_id, game_id):
            raise DuplicateFieldError("game_id", "You already own this game")
        if self._wishlist.get_by_user_and_game(user_id, game_id):
            raise DuplicateFieldError("game_id", "Game is already on your wishlist")
        return self._wishlist.create(user_id, game_id, target_price)

    def list_for_user(self, user_id: int) -> list[UserGameWishlist]:
        entries = self._wishlist.list_for_user(user_id)
        return sorted(entries, key=lambda entry: entry.game.title.lower())

    def wishlisted_game_ids(self, user_id: int) -> set[int]:
        return self._wishlist.list_game_ids_for_user(user_id)

    def get_wishlist_entry(self, wishlist_id: int) -> UserGameWishlist | None:
        return self._wishlist.get_by_id(wishlist_id)

    def update_target_price(self, entry: UserGameWishlist, target_price: Decimal | None) -> UserGameWishlist:
        return self._wishlist.update_target_price(entry, target_price)

    def remove_entry(self, entry: UserGameWishlist) -> None:
        self._wishlist.delete(entry)

    def mark_purchased(
        self, entry: UserGameWishlist, ownership_type: str, price_paid: Decimal | None
    ) -> UserGameLibrary:
        """Adding to the library takes the game off the wishlist (see LibraryService.add_to_library)."""
        return self._library_service.add_to_library(entry.user_id, entry.game_id, ownership_type, price_paid)
