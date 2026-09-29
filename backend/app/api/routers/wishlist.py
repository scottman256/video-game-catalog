from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_library_user, get_storage
from app.api.mappers import to_library_entry_out, to_library_game_summary
from app.db.session import get_db
from app.models.user import User
from app.models.user_game_wishlist import UserGameWishlist
from app.schemas.library import LibraryEntryOut
from app.schemas.wishlist import (
    WishlistCreateRequest,
    WishlistEntryOut,
    WishlistPurchaseRequest,
    WishlistUpdateRequest,
)
from app.services.exceptions import DuplicateFieldError, GameNotFoundError
from app.services.wishlist_service import WishlistService
from app.storage.base import StorageBackend

router = APIRouter(prefix="/me/wishlist", tags=["wishlist"])


@router.get("", response_model=list[WishlistEntryOut])
def list_my_wishlist(
    current_user: User = Depends(get_library_user),
    db: Session = Depends(get_db),
    storage: StorageBackend = Depends(get_storage),
) -> list[WishlistEntryOut]:
    entries = WishlistService(db).list_for_user(current_user.id)
    return [_to_entry_out(entry, storage) for entry in entries]


@router.post("", response_model=WishlistEntryOut, status_code=status.HTTP_201_CREATED)
def add_to_wishlist(
    payload: WishlistCreateRequest,
    current_user: User = Depends(get_library_user),
    db: Session = Depends(get_db),
    storage: StorageBackend = Depends(get_storage),
) -> WishlistEntryOut:
    try:
        entry = WishlistService(db).add_to_wishlist(current_user.id, payload.game_id, payload.target_price)
    except GameNotFoundError as error:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(error)) from error
    except DuplicateFieldError as error:
        raise HTTPException(status.HTTP_409_CONFLICT, error.message) from error
    return _to_entry_out(entry, storage)


@router.patch("/{wishlist_id}", response_model=WishlistEntryOut)
def update_wishlist_entry(
    wishlist_id: int,
    payload: WishlistUpdateRequest,
    current_user: User = Depends(get_library_user),
    db: Session = Depends(get_db),
    storage: StorageBackend = Depends(get_storage),
) -> WishlistEntryOut:
    entry = _get_owned_entry_or_404(db, wishlist_id, current_user.id)
    updated = WishlistService(db).update_target_price(entry, payload.target_price)
    return _to_entry_out(updated, storage)


@router.delete("/{wishlist_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_wishlist_entry(
    wishlist_id: int, current_user: User = Depends(get_library_user), db: Session = Depends(get_db)
) -> None:
    entry = _get_owned_entry_or_404(db, wishlist_id, current_user.id)
    WishlistService(db).remove_entry(entry)


@router.post("/{wishlist_id}/purchase", response_model=LibraryEntryOut, status_code=status.HTTP_201_CREATED)
def mark_wishlist_entry_purchased(
    wishlist_id: int,
    payload: WishlistPurchaseRequest,
    current_user: User = Depends(get_library_user),
    db: Session = Depends(get_db),
    storage: StorageBackend = Depends(get_storage),
) -> LibraryEntryOut:
    entry = _get_owned_entry_or_404(db, wishlist_id, current_user.id)
    try:
        library_entry = WishlistService(db).mark_purchased(entry, payload.ownership_type, payload.price_paid)
    except DuplicateFieldError as error:
        raise HTTPException(status.HTTP_409_CONFLICT, error.message) from error
    return to_library_entry_out(library_entry, storage)


def _get_owned_entry_or_404(db: Session, wishlist_id: int, user_id: int) -> UserGameWishlist:
    entry = WishlistService(db).get_wishlist_entry(wishlist_id)
    if not entry or entry.user_id != user_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Wishlist entry not found")
    return entry


def _to_entry_out(entry: UserGameWishlist, storage: StorageBackend) -> WishlistEntryOut:
    return WishlistEntryOut(
        id=entry.id,
        game=to_library_game_summary(entry.game, storage),
        target_price=entry.target_price,
        added_at=entry.added_at,
    )
