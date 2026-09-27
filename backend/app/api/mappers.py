from sqlalchemy.orm import Session

from app.models.game import Game
from app.models.game_image import GameImage
from app.schemas.admin import AdminGameOut, AdminGameSummaryOut
from app.schemas.game import GameImageOut, GameOut
from app.schemas.system import SystemOut
from app.services.review_service import ReviewService
from app.storage.base import StorageBackend


def box_art_url(game: Game, storage: StorageBackend) -> str | None:
    box_art = next((image for image in game.images if image.kind == "box_art"), None)
    return storage.url_for(box_art.storage_key) if box_art else None


def to_image_out(image: GameImage, storage: StorageBackend) -> GameImageOut:
    return GameImageOut(
        id=image.id, kind=image.kind, url=storage.url_for(image.storage_key), display_order=image.display_order
    )


def to_game_out(game: Game, storage: StorageBackend, db: Session, owned_game_ids: set[int]) -> GameOut:
    images = [to_image_out(image, storage) for image in game.images]
    return GameOut(
        id=game.id,
        title=game.title,
        summary=game.summary,
        release_year=game.release_year,
        esrb_rating=game.esrb_rating,
        system=SystemOut.model_validate(game.system),
        images=images,
        community_average_score=ReviewService(db).community_average_score(game.id),
        in_library=game.id in owned_game_ids,
        is_approved=game.is_approved,
    )


def to_admin_game_out(game: Game, storage: StorageBackend, db: Session) -> AdminGameOut:
    game_out = to_game_out(game, storage, db, owned_game_ids=set())
    return AdminGameOut(
        **game_out.model_dump(), submitted_by=game.created_by.username, submitted_at=game.created_at
    )


def to_admin_game_summary_out(game: Game, storage: StorageBackend) -> AdminGameSummaryOut:
    return AdminGameSummaryOut(
        id=game.id,
        title=game.title,
        release_year=game.release_year,
        system=SystemOut.model_validate(game.system),
        box_art_url=box_art_url(game, storage),
        is_approved=game.is_approved,
        submitted_by=game.created_by.username,
        submitted_at=game.created_at,
    )
