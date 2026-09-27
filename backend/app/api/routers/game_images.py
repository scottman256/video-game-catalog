from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_storage
from app.api.mappers import to_image_out
from app.db.session import get_db
from app.models.user import User
from app.schemas.game import GameImageOut
from app.services.exceptions import InvalidImageError
from app.services.game_image_service import GameImageService
from app.services.game_service import GameService, can_manage_game_images
from app.storage.base import StorageBackend

router = APIRouter(prefix="/games/{game_id}/images", tags=["game-images"])


@router.post("", response_model=GameImageOut, status_code=status.HTTP_201_CREATED)
async def upload_image(
    game_id: int,
    kind: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    storage: StorageBackend = Depends(get_storage),
) -> GameImageOut:
    _ensure_can_manage_images(db, game_id, current_user)
    return await save_uploaded_image(GameImageService(db, storage), game_id, kind, file, storage)


async def save_uploaded_image(
    service: GameImageService, game_id: int, kind: str, file: UploadFile, storage: StorageBackend
) -> GameImageOut:
    try:
        image = service.add_image(game_id, kind, await file.read())
    except InvalidImageError as error:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(error)) from error
    return to_image_out(image, storage)


def _ensure_can_manage_images(db: Session, game_id: int, user: User) -> None:
    game = GameService(db).get_visible(game_id, user)
    if not game:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Game not found")
    if not can_manage_game_images(game, user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the submitter or an admin can change this game's images")
