from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_storage
from app.db.session import get_db
from app.models.user import User
from app.models.user_game_library import UserGameLibrary
from app.schemas.library import (
    LibraryCreateRequest,
    LibraryEntryOut,
    LibraryGameSummary,
    LibraryUpdateRequest,
    SortDirection,
    SortField,
)
from app.schemas.system import SystemOut
from app.services.exceptions import DuplicateFieldError, GameNotFoundError
from app.services.library_service import LibraryService
from app.services.review_service import compute_weighted_score
from app.storage.base import StorageBackend

router = APIRouter(prefix="/me/library", tags=["library"])


@router.get("", response_model=list[LibraryEntryOut])
def list_my_library(
    sort: SortField = "title",
    direction: SortDirection = "asc",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    storage: StorageBackend = Depends(get_storage),
) -> list[LibraryEntryOut]:
    entries = LibraryService(db).list_sorted(current_user.id, sort, direction)
    return [_to_entry_out(entry, storage) for entry in entries]


@router.post("", response_model=LibraryEntryOut, status_code=status.HTTP_201_CREATED)
def add_to_library(
    payload: LibraryCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    storage: StorageBackend = Depends(get_storage),
) -> LibraryEntryOut:
    try:
        entry = LibraryService(db).add_to_library(
            current_user.id, payload.game_id, payload.ownership_type, payload.price_paid
        )
    except GameNotFoundError as error:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(error)) from error
    except DuplicateFieldError as error:
        raise HTTPException(status.HTTP_409_CONFLICT, error.message) from error
    return _to_entry_out(entry, storage)


@router.get("/{library_id}", response_model=LibraryEntryOut)
def get_library_entry(
    library_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    storage: StorageBackend = Depends(get_storage),
) -> LibraryEntryOut:
    entry = _get_owned_entry_or_404(db, library_id, current_user.id)
    return _to_entry_out(entry, storage)


@router.patch("/{library_id}", response_model=LibraryEntryOut)
def update_library_entry(
    library_id: int,
    payload: LibraryUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    storage: StorageBackend = Depends(get_storage),
) -> LibraryEntryOut:
    entry = _get_owned_entry_or_404(db, library_id, current_user.id)
    updated = LibraryService(db).update_entry(entry, payload.ownership_type, payload.price_paid)
    return _to_entry_out(updated, storage)


@router.delete("/{library_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_library_entry(
    library_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> None:
    entry = _get_owned_entry_or_404(db, library_id, current_user.id)
    LibraryService(db).remove_entry(entry)


def _get_owned_entry_or_404(db: Session, library_id: int, user_id: int) -> UserGameLibrary:
    entry = LibraryService(db).get_library_entry(library_id)
    if not entry or entry.user_id != user_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Library entry not found")
    return entry


def _to_entry_out(entry: UserGameLibrary, storage: StorageBackend) -> LibraryEntryOut:
    box_art = next((img for img in entry.game.images if img.kind == "box_art"), None)
    game_summary = LibraryGameSummary(
        id=entry.game.id,
        title=entry.game.title,
        release_year=entry.game.release_year,
        system=SystemOut.model_validate(entry.game.system),
        box_art_url=storage.url_for(box_art.storage_key) if box_art else None,
    )
    return LibraryEntryOut(
        id=entry.id,
        game=game_summary,
        ownership_type=entry.ownership_type,
        price_paid=entry.price_paid,
        added_at=entry.added_at,
        weighted_score=compute_weighted_score(entry.review),
    )
