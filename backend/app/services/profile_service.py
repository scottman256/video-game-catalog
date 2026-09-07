import uuid
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.user import User
from app.repositories.library_repository import LibraryRepository
from app.repositories.review_repository import ReviewRepository
from app.repositories.user_repository import UserRepository
from app.services.image_validation import validate_and_get_extension
from app.services.review_service import compute_weighted_score
from app.storage.base import StorageBackend

PROFILE_PICTURE_SUBDIRECTORY = "profile_pictures"


@dataclass(frozen=True)
class ProfileSummary:
    username: str
    email: str
    created_at: datetime
    profile_picture_storage_key: str | None
    games_owned: int
    systems_owned: int
    average_review_score: float | None


class ProfileService:
    def __init__(self, db: Session, storage: StorageBackend) -> None:
        self._users = UserRepository(db)
        self._library = LibraryRepository(db)
        self._reviews = ReviewRepository(db)
        self._storage = storage

    def get_profile(self, user: User) -> ProfileSummary:
        return ProfileSummary(
            username=user.username,
            email=user.email,
            created_at=user.created_at,
            profile_picture_storage_key=user.profile_picture_storage_key,
            games_owned=self._library.count_for_user(user.id),
            systems_owned=self._library.count_distinct_systems_for_user(user.id),
            average_review_score=self.average_review_score(user.id),
        )

    def average_review_score(self, user_id: int) -> float | None:
        reviews = self._reviews.list_for_user(user_id)
        scores = [score for review in reviews if (score := compute_weighted_score(review)) is not None]
        return round(sum(scores) / len(scores), 2) if scores else None

    def update_profile_picture(self, user: User, content: bytes) -> User:
        extension = validate_and_get_extension(content)
        filename = f"{uuid.uuid4()}.{extension}"
        storage_key = self._storage.save(PROFILE_PICTURE_SUBDIRECTORY, filename, content)
        return self._users.set_profile_picture(user, storage_key)
