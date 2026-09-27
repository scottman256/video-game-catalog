from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.game_image import GameImage


class GameImageRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def create(self, game_id: int, kind: str, storage_key: str, display_order: int) -> GameImage:
        image = GameImage(game_id=game_id, kind=kind, storage_key=storage_key, display_order=display_order)
        self._db.add(image)
        self._db.flush()
        return image

    def get_by_id(self, image_id: int) -> GameImage | None:
        return self._db.get(GameImage, image_id)

    def list_for_game(self, game_id: int, kind: str | None = None) -> list[GameImage]:
        stmt = select(GameImage).where(GameImage.game_id == game_id)
        if kind is not None:
            stmt = stmt.where(GameImage.kind == kind)
        return list(self._db.scalars(stmt))

    def next_screenshot_order(self, game_id: int) -> int:
        stmt = select(func.max(GameImage.display_order)).where(
            GameImage.game_id == game_id, GameImage.kind == "screenshot"
        )
        highest = self._db.scalar(stmt)
        return 0 if highest is None else highest + 1

    def delete(self, image: GameImage) -> None:
        self._db.delete(image)
        self._db.flush()
