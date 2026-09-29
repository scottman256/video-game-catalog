from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.user_game_library import UserGameLibrary
from app.repositories.game_repository import GameRepository
from app.repositories.library_repository import LibraryRepository
from app.repositories.wishlist_repository import WishlistRepository
from app.services.exceptions import DuplicateFieldError, GameNotFoundError
from app.services.game_service import is_game_collectible_by
from app.services.review_service import compute_weighted_score

_SORT_KEYS = {
    "title": lambda entry: entry.game.title.lower(),
    "release_year": lambda entry: entry.game.release_year,
    "system": lambda entry: entry.game.system.name.lower(),
    "added_at": lambda entry: entry.added_at,
}


class LibraryService:
    def __init__(self, db: Session) -> None:
        self._library = LibraryRepository(db)
        self._games = GameRepository(db)
        self._wishlist = WishlistRepository(db)

    def add_to_library(
        self, user_id: int, game_id: int, ownership_type: str, price_paid: Decimal | None
    ) -> UserGameLibrary:
        if not is_game_collectible_by(self._games.get_by_id(game_id), user_id):
            raise GameNotFoundError(f"Game {game_id} does not exist")
        if self._library.get_by_user_and_game(user_id, game_id):
            raise DuplicateFieldError("game_id", "Game is already in your library")
        self._remove_from_wishlist(user_id, game_id)
        return self._library.create(user_id, game_id, ownership_type, price_paid)

    def _remove_from_wishlist(self, user_id: int, game_id: int) -> None:
        wishlist_entry = self._wishlist.get_by_user_and_game(user_id, game_id)
        if wishlist_entry:
            self._wishlist.delete(wishlist_entry)

    def owned_game_ids(self, user_id: int) -> set[int]:
        return self._library.list_game_ids_for_user(user_id)

    def list_sorted(self, user_id: int, sort: str, direction: str) -> list[UserGameLibrary]:
        entries = self._library.list_for_user(user_id)
        if sort == "rating":
            return self._sort_by_rating(entries, direction)
        key = _SORT_KEYS.get(sort, _SORT_KEYS["title"])
        return sorted(entries, key=key, reverse=(direction == "desc"))

    def _sort_by_rating(self, entries: list[UserGameLibrary], direction: str) -> list[UserGameLibrary]:
        scored = [(entry, compute_weighted_score(entry.review)) for entry in entries]
        rated = sorted((p for p in scored if p[1] is not None), key=lambda p: p[1], reverse=(direction == "desc"))
        unrated = [pair for pair in scored if pair[1] is None]
        return [entry for entry, _ in rated + unrated]

    def get_library_entry(self, library_id: int) -> UserGameLibrary | None:
        return self._library.get_by_id(library_id)

    def update_entry(
        self, entry: UserGameLibrary, ownership_type: str | None, price_paid: Decimal | None
    ) -> UserGameLibrary:
        return self._library.update(entry, ownership_type, price_paid)

    def remove_entry(self, entry: UserGameLibrary) -> None:
        self._library.delete(entry)
