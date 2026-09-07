from sqlalchemy.orm import Session

from app.models.user_game_review import UserGameReview
from app.repositories.review_repository import ReviewRepository

_WEIGHTS = {
    "graphics_performance": 0.20,
    "music_sound": 0.15,
    "controls_playability": 0.20,
    "content_length": 0.20,
    "fun_factor": 0.25,
}


def compute_weighted_score(review: UserGameReview | None) -> float | None:
    if review is None:
        return None
    rated = {field: getattr(review, field) for field in _WEIGHTS if getattr(review, field) is not None}
    if not rated:
        return None
    total_weight = sum(_WEIGHTS[field] for field in rated)
    weighted_sum = sum(_WEIGHTS[field] * value / 2 for field, value in rated.items())
    return round(weighted_sum / total_weight, 2)


class ReviewService:
    def __init__(self, db: Session) -> None:
        self._reviews = ReviewRepository(db)

    def get_review(self, user_library_id: int) -> UserGameReview | None:
        return self._reviews.get_by_library_id(user_library_id)

    def upsert_review(self, user_library_id: int, scores: dict[str, int | None]) -> UserGameReview:
        return self._reviews.upsert(user_library_id, scores)

    def community_average_score(self, game_id: int) -> float | None:
        reviews = self._reviews.list_for_game(game_id)
        scores = [score for review in reviews if (score := compute_weighted_score(review)) is not None]
        return round(sum(scores) / len(scores), 2) if scores else None
