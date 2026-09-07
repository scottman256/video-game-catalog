from sqlalchemy.orm import Session

from app.repositories.user_repository import UserRepository
from app.services.exceptions import DuplicateFieldError


class UserService:
    def __init__(self, db: Session) -> None:
        self._users = UserRepository(db)

    def ensure_username_and_email_available(self, username: str, email: str) -> None:
        if self._users.username_exists(username):
            raise DuplicateFieldError("username", "Username is already taken")
        if self._users.email_exists(email):
            raise DuplicateFieldError("email", "Email is already registered")
