from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_storage
from app.db.session import get_db
from app.models.user import User
from app.schemas.game import GameImageOut
from app.services.exceptions import InvalidImageError
from app.services.game_image_service import GameImageService
from app.services.game_service import GameService
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
    if not GameService(db).get_by_id(game_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Game not found")
    content = await file.read()
    try:
        image = GameImageService(db, storage).add_image(game_id, kind, content)
    except InvalidImageError as error:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(error)) from error
    return GameImageOut(
        id=image.id, kind=image.kind, url=storage.url_for(image.storage_key), display_order=image.display_order
    )
