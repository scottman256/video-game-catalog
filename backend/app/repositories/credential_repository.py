from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.credential import PasswordCredential


class CredentialRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def create(self, user_id: int, password_hash: str) -> PasswordCredential:
        credential = PasswordCredential(user_id=user_id, password_hash=password_hash)
        self._db.add(credential)
        self._db.flush()
        return credential

    def get_by_user_id(self, user_id: int) -> PasswordCredential | None:
        stmt = select(PasswordCredential).where(PasswordCredential.user_id == user_id)
        return self._db.scalar(stmt)
