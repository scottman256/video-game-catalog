from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User


class UserRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def create(self, username: str, email: str) -> User:
        user = User(username=username, email=email)
        self._db.add(user)
        self._db.flush()
        return user

    def get_by_id(self, user_id: int) -> User | None:
        return self._db.get(User, user_id)

    def get_by_username_or_email(self, identifier: str) -> User | None:
        stmt = select(User).where((User.username == identifier) | (User.email == identifier))
        return self._db.scalar(stmt)

    def list_non_admins(self) -> list[User]:
        stmt = select(User).where(User.is_admin.is_(False)).order_by(User.username)
        return list(self._db.scalars(stmt))

    def set_admin(self, user: User, is_admin: bool) -> User:
        user.is_admin = is_admin
        self._db.flush()
        return user

    def set_profile_picture(self, user: User, storage_key: str) -> User:
        user.profile_picture_storage_key = storage_key
        self._db.flush()
        return user

    def username_exists(self, username: str) -> bool:
        return self._db.scalar(select(User.id).where(User.username == username)) is not None

    def email_exists(self, email: str) -> bool:
        return self._db.scalar(select(User.id).where(User.email == email)) is not None
