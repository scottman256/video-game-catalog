from typing import Literal

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Response, UploadFile, status
from sqlalchemy.orm import Session

from app.api.cookies import set_http_only_cookie
from app.api.deps import IMPERSONATION_COOKIE, get_current_admin, get_storage
from app.api.mappers import to_admin_game_out, to_admin_game_summary_out
from app.api.routers.game_images import save_uploaded_image
from app.core.config import get_settings
from app.db.session import get_db
from app.models.game import Game
from app.models.user import User
from app.schemas.admin import (
    AdminGameOut,
    AdminGameSummaryOut,
    AdminUserOut,
    GameUpdateRequest,
    ImpersonationRequest,
)
from app.schemas.game import GameImageOut
from app.schemas.user import UserOut
from app.services.admin_game_service import AdminGameService
from app.services.exceptions import (
    GameNotFoundError,
    ImageNotFoundError,
    ImpersonationError,
    SystemNotFoundError,
)
from app.services.game_deletion_service import GameDeletionService
from app.services.game_image_service import GameImageService
from app.services.impersonation_service import ImpersonationService
from app.storage.base import StorageBackend

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(get_current_admin)])
settings = get_settings()

ApprovalStatus = Literal["all", "pending", "approved"]
_IS_APPROVED_BY_STATUS: dict[str, bool | None] = {"all": None, "pending": False, "approved": True}


@router.get("/games", response_model=list[AdminGameSummaryOut])
def list_games(
    q: str = Query(default=""),
    approval_status: ApprovalStatus = Query(default="all", alias="status"),
    db: Session = Depends(get_db),
    storage: StorageBackend = Depends(get_storage),
) -> list[AdminGameSummaryOut]:
    games = AdminGameService(db).list_games(q, _IS_APPROVED_BY_STATUS[approval_status])
    return [to_admin_game_summary_out(game, storage) for game in games]


@router.get("/games/pending", response_model=list[AdminGameSummaryOut])
def list_pending_games(
    db: Session = Depends(get_db), storage: StorageBackend = Depends(get_storage)
) -> list[AdminGameSummaryOut]:
    return [to_admin_game_summary_out(game, storage) for game in AdminGameService(db).list_pending()]


@router.get("/games/{game_id}", response_model=AdminGameOut)
def get_game(
    game_id: int, db: Session = Depends(get_db), storage: StorageBackend = Depends(get_storage)
) -> AdminGameOut:
    return to_admin_game_out(_get_game_or_404(db, game_id), storage, db)


@router.patch("/games/{game_id}", response_model=AdminGameOut)
def update_game(
    game_id: int,
    payload: GameUpdateRequest,
    db: Session = Depends(get_db),
    storage: StorageBackend = Depends(get_storage),
) -> AdminGameOut:
    game = _apply_game_changes(lambda service, changes: service.update_game(game_id, changes), db, payload)
    return to_admin_game_out(game, storage, db)


@router.delete("/games/{game_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_game(game_id: int, db: Session = Depends(get_db), storage: StorageBackend = Depends(get_storage)) -> None:
    try:
        GameDeletionService(db, storage).delete_game(game_id)
    except GameNotFoundError as error:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(error)) from error


@router.post("/games/{game_id}/approve", response_model=AdminGameOut)
def approve_game(
    game_id: int,
    payload: GameUpdateRequest,
    db: Session = Depends(get_db),
    storage: StorageBackend = Depends(get_storage),
) -> AdminGameOut:
    game = _apply_game_changes(lambda service, changes: service.approve_game(game_id, changes), db, payload)
    return to_admin_game_out(game, storage, db)


@router.post("/games/{game_id}/images", response_model=GameImageOut, status_code=status.HTTP_201_CREATED)
async def upload_game_image(
    game_id: int,
    kind: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    storage: StorageBackend = Depends(get_storage),
) -> GameImageOut:
    _get_game_or_404(db, game_id)
    return await save_uploaded_image(GameImageService(db, storage), game_id, kind, file, storage)


@router.delete("/games/{game_id}/images/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_game_image(
    game_id: int, image_id: int, db: Session = Depends(get_db), storage: StorageBackend = Depends(get_storage)
) -> None:
    try:
        GameImageService(db, storage).delete_image(game_id, image_id)
    except ImageNotFoundError as error:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(error)) from error


@router.get("/users", response_model=list[AdminUserOut])
def list_users(db: Session = Depends(get_db), storage: StorageBackend = Depends(get_storage)) -> list[AdminUserOut]:
    return [_to_admin_user_out(user, storage) for user in ImpersonationService(db).list_impersonatable_users()]


@router.post("/impersonation", response_model=UserOut)
def start_impersonation(
    payload: ImpersonationRequest,
    response: Response,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> UserOut:
    try:
        target, token = ImpersonationService(db).start(admin, payload.user_id)
    except ImpersonationError as error:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(error)) from error
    set_http_only_cookie(response, IMPERSONATION_COOKIE, token, settings.impersonation_ttl_minutes * 60)
    return UserOut.for_session(target, admin)


@router.delete("/impersonation", response_model=UserOut)
def stop_impersonation(response: Response, admin: User = Depends(get_current_admin)) -> UserOut:
    response.delete_cookie(IMPERSONATION_COOKIE)
    return UserOut.for_session(admin, admin)


def _get_game_or_404(db: Session, game_id: int) -> Game:
    try:
        return AdminGameService(db).get_game(game_id)
    except GameNotFoundError as error:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(error)) from error


def _apply_game_changes(change, db: Session, payload: GameUpdateRequest) -> Game:
    try:
        return change(AdminGameService(db), payload.model_dump(exclude_unset=True))
    except GameNotFoundError as error:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(error)) from error
    except SystemNotFoundError as error:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(error)) from error


def _to_admin_user_out(user: User, storage: StorageBackend) -> AdminUserOut:
    storage_key = user.profile_picture_storage_key
    return AdminUserOut(
        id=user.id,
        username=user.username,
        email=user.email,
        created_at=user.created_at,
        profile_picture_url=storage.url_for(storage_key) if storage_key else None,
    )
