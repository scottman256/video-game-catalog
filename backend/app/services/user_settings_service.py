from sqlalchemy.orm import Session

from app.models.user_settings import UserSettings
from app.repositories.user_settings_repository import UserSettingsRepository

_DEFAULT_DARK_MODE = False


class UserSettingsService:
    def __init__(self, db: Session) -> None:
        self._settings = UserSettingsRepository(db)

    def get_settings(self, user_id: int) -> UserSettings | None:
        return self._settings.get_by_user_id(user_id)

    def get_dark_mode(self, user_id: int) -> bool:
        settings = self._settings.get_by_user_id(user_id)
        return settings.dark_mode if settings else _DEFAULT_DARK_MODE

    def set_dark_mode(self, user_id: int, dark_mode: bool) -> UserSettings:
        return self._settings.upsert_dark_mode(user_id, dark_mode)
