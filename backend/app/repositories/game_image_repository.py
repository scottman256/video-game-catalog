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

    def count_screenshots_for_game(self, game_id: int) -> int:
        stmt = (
            select(func.count())
            .select_from(GameImage)
            .where(GameImage.game_id == game_id, GameImage.kind == "screenshot")
        )
        return self._db.scalar(stmt) or 0
