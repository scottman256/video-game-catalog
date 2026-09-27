from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_storage
from app.api.mappers import to_game_out
from app.db.session import get_db
from app.models.user import User
from app.schemas.game import GameCreateRequest, GameOut
from app.services.exceptions import SystemNotFoundError
from app.services.game_service import GameService
from app.services.library_service import LibraryService
from app.storage.base import StorageBackend

router = APIRouter(prefix="/games", tags=["games"])


@router.get("", response_model=list[GameOut])
def search_games(
    q: str = Query(default=""),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    storage: StorageBackend = Depends(get_storage),
) -> list[GameOut]:
    games = GameService(db).search(q, current_user)
    owned_game_ids = LibraryService(db).owned_game_ids(current_user.id)
    return [to_game_out(game, storage, db, owned_game_ids) for game in games]


@router.get("/{game_id}", response_model=GameOut)
def get_game(
    game_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    storage: StorageBackend = Depends(get_storage),
) -> GameOut:
    game = GameService(db).get_visible(game_id, current_user)
    if not game:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Game not found")
    owned_game_ids = LibraryService(db).owned_game_ids(current_user.id)
    return to_game_out(game, storage, db, owned_game_ids)


@router.post("", response_model=GameOut, status_code=status.HTTP_201_CREATED)
def create_game(
    payload: GameCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    storage: StorageBackend = Depends(get_storage),
) -> GameOut:
    try:
        game = GameService(db).create_game(
            payload.title,
            payload.summary,
            payload.release_year,
            payload.system_id,
            payload.esrb_rating,
            creator=current_user,
        )
    except SystemNotFoundError as error:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(error)) from error
    return to_game_out(game, storage, db, owned_game_ids=set())
