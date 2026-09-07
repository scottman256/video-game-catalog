from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_storage
from app.db.session import get_db
from app.models.game import Game
from app.models.user import User
from app.schemas.game import GameCreateRequest, GameImageOut, GameOut
from app.schemas.system import SystemOut
from app.services.game_service import GameService
from app.services.library_service import LibraryService
from app.services.review_service import ReviewService
from app.storage.base import StorageBackend

router = APIRouter(prefix="/games", tags=["games"])


@router.get("", response_model=list[GameOut])
def search_games(
    q: str = Query(default=""),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    storage: StorageBackend = Depends(get_storage),
) -> list[GameOut]:
    games = GameService(db).search(q)
    owned_game_ids = LibraryService(db).owned_game_ids(current_user.id)
    return [_to_game_out(game, storage, db, owned_game_ids) for game in games]


@router.get("/{game_id}", response_model=GameOut)
def get_game(
    game_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    storage: StorageBackend = Depends(get_storage),
) -> GameOut:
    game = GameService(db).get_by_id(game_id)
    if not game:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Game not found")
    owned_game_ids = LibraryService(db).owned_game_ids(current_user.id)
    return _to_game_out(game, storage, db, owned_game_ids)


@router.post("", response_model=GameOut, status_code=status.HTTP_201_CREATED)
def create_game(
    payload: GameCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    storage: StorageBackend = Depends(get_storage),
) -> GameOut:
    game = GameService(db).create_game(
        payload.title,
        payload.summary,
        payload.release_year,
        payload.system_id,
        payload.esrb_rating,
        current_user.id,
    )
    return _to_game_out(game, storage, db, owned_game_ids=set())


def _to_game_out(game: Game, storage: StorageBackend, db: Session, owned_game_ids: set[int]) -> GameOut:
    images = [
        GameImageOut(id=img.id, kind=img.kind, url=storage.url_for(img.storage_key), display_order=img.display_order)
        for img in game.images
    ]
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
    )
