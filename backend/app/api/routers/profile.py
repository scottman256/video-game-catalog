from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_storage
from app.db.session import get_db
from app.models.user import User
from app.schemas.profile import ProfileOut
from app.services.exceptions import InvalidImageError
from app.services.profile_service import ProfileService, ProfileSummary
from app.storage.base import StorageBackend

router = APIRouter(prefix="/me/profile", tags=["profile"])


@router.get("", response_model=ProfileOut)
def get_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    storage: StorageBackend = Depends(get_storage),
) -> ProfileOut:
    summary = ProfileService(db, storage).get_profile(current_user)
    return _to_profile_out(summary, storage)


@router.post("/picture", response_model=ProfileOut)
async def upload_profile_picture(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    storage: StorageBackend = Depends(get_storage),
) -> ProfileOut:
    service = ProfileService(db, storage)
    content = await file.read()
    try:
        updated_user = service.update_profile_picture(current_user, content)
    except InvalidImageError as error:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(error)) from error
    return _to_profile_out(service.get_profile(updated_user), storage)


def _to_profile_out(summary: ProfileSummary, storage: StorageBackend) -> ProfileOut:
    storage_key = summary.profile_picture_storage_key
    return ProfileOut(
        username=summary.username,
        email=summary.email,
        created_at=summary.created_at,
        profile_picture_url=storage.url_for(storage_key) if storage_key else None,
        games_owned=summary.games_owned,
        systems_owned=summary.systems_owned,
        average_review_score=summary.average_review_score,
    )
