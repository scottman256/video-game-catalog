import uuid

from sqlalchemy.orm import Session

from app.models.game_image import GameImage
from app.repositories.game_image_repository import GameImageRepository
from app.services.exceptions import InvalidImageError
from app.services.image_validation import validate_and_get_extension
from app.storage.base import StorageBackend

_ALLOWED_KINDS = ("box_art", "screenshot")
_SUBDIRECTORY_BY_KIND = {"box_art": "box_art", "screenshot": "screenshots"}


class GameImageService:
    def __init__(self, db: Session, storage: StorageBackend) -> None:
        self._images = GameImageRepository(db)
        self._storage = storage

    def add_image(self, game_id: int, kind: str, content: bytes) -> GameImage:
        if kind not in _ALLOWED_KINDS:
            raise InvalidImageError(f"kind must be one of {_ALLOWED_KINDS}")
        extension = validate_and_get_extension(content)
        storage_key = self._save(kind, content, extension)
        display_order = self._images.count_screenshots_for_game(game_id) if kind == "screenshot" else 0
        return self._images.create(game_id, kind, storage_key, display_order)

    def _save(self, kind: str, content: bytes, extension: str) -> str:
        filename = f"{uuid.uuid4()}.{extension}"
        return self._storage.save(_SUBDIRECTORY_BY_KIND[kind], filename, content)
