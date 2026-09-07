from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.user_settings import UserSettingsOut, UserSettingsUpdateRequest
from app.services.user_settings_service import UserSettingsService

router = APIRouter(prefix="/me/settings", tags=["settings"])


@router.get("", response_model=UserSettingsOut)
def get_settings(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> UserSettingsOut:
    dark_mode = UserSettingsService(db).get_dark_mode(current_user.id)
    return UserSettingsOut(dark_mode=dark_mode)


@router.put("", response_model=UserSettingsOut)
def update_settings(
    payload: UserSettingsUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserSettingsOut:
    settings = UserSettingsService(db).set_dark_mode(current_user.id, payload.dark_mode)
    return UserSettingsOut(dark_mode=settings.dark_mode)
