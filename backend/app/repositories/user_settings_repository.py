from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user_settings import UserSettings


class UserSettingsRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def get_by_user_id(self, user_id: int) -> UserSettings | None:
        stmt = select(UserSettings).where(UserSettings.user_id == user_id)
        return self._db.scalar(stmt)

    def upsert_dark_mode(self, user_id: int, dark_mode: bool) -> UserSettings:
        settings = self.get_by_user_id(user_id)
        if settings is None:
            settings = UserSettings(user_id=user_id, dark_mode=dark_mode)
            self._db.add(settings)
        else:
            settings.dark_mode = dark_mode
        self._db.flush()
        return settings
