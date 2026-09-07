from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.models.user_game_review import UserGameReview
from app.schemas.review import ReviewOut, ReviewUpsertRequest
from app.services.library_service import LibraryService
from app.services.review_service import ReviewService, compute_weighted_score

router = APIRouter(prefix="/me/library/{library_id}/review", tags=["reviews"])


@router.get("", response_model=ReviewOut)
def get_review(
    library_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> ReviewOut:
    _ensure_owns_entry(db, library_id, current_user.id)
    return _to_review_out(ReviewService(db).get_review(library_id))


@router.put("", response_model=ReviewOut)
def upsert_review(
    library_id: int,
    payload: ReviewUpsertRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ReviewOut:
    _ensure_owns_entry(db, library_id, current_user.id)
    review = ReviewService(db).upsert_review(library_id, payload.model_dump())
    return _to_review_out(review)


def _ensure_owns_entry(db: Session, library_id: int, user_id: int) -> None:
    entry = LibraryService(db).get_library_entry(library_id)
    if not entry or entry.user_id != user_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Library entry not found")


def _to_review_out(review: UserGameReview | None) -> ReviewOut:
    return ReviewOut(
        graphics_performance=review.graphics_performance if review else None,
        music_sound=review.music_sound if review else None,
        controls_playability=review.controls_playability if review else None,
        content_length=review.content_length if review else None,
        fun_factor=review.fun_factor if review else None,
        weighted_score=compute_weighted_score(review),
    )
