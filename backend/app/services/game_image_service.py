import uuid

from sqlalchemy.orm import Session

from app.models.game_image import GameImage
from app.repositories.game_image_repository import GameImageRepository
from app.services.exceptions import ImageNotFoundError, InvalidImageError
from app.services.image_validation import validate_and_get_extension
from app.storage.base import StorageBackend

_ALLOWED_KINDS = ("box_art", "screenshot")
_SUBDIRECTORY_BY_KIND = {"box_art": "box_art", "screenshot": "screenshots"}


class GameImageService:
    def __init__(self, db: Session, storage: StorageBackend) -> None:
        self._images = GameImageRepository(db)
        self._storage = storage

    def add_image(self, game_id: int, kind: str, content: bytes) -> GameImage:
        """A game has one box art, so uploading a new one replaces the old."""
        if kind not in _ALLOWED_KINDS:
            raise InvalidImageError(f"kind must be one of {_ALLOWED_KINDS}")
        extension = validate_and_get_extension(content)
        if kind == "box_art":
            self._remove_images(self._images.list_for_game(game_id, "box_art"))
        storage_key = self._save(kind, content, extension)
        display_order = self._images.next_screenshot_order(game_id) if kind == "screenshot" else 0
        return self._images.create(game_id, kind, storage_key, display_order)

    def delete_image(self, game_id: int, image_id: int) -> None:
        image = self._images.get_by_id(image_id)
        if not image or image.game_id != game_id:
            raise ImageNotFoundError(f"Image {image_id} does not belong to game {game_id}")
        self._remove_images([image])

    def delete_all_images(self, game_id: int) -> None:
        self._remove_images(self._images.list_for_game(game_id))

    def _remove_images(self, images: list[GameImage]) -> None:
        for image in images:
            self._images.delete(image)
            self._storage.delete(image.storage_key)

    def _save(self, kind: str, content: bytes, extension: str) -> str:
        filename = f"{uuid.uuid4()}.{extension}"
        return self._storage.save(_SUBDIRECTORY_BY_KIND[kind], filename, content)
