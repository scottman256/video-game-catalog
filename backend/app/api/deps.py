from fastapi import Depends, HTTPException, Request, status
from jwt import PyJWTError
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.db.session import get_db
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.storage.base import StorageBackend
from app.storage.local_disk_storage import LocalDiskStorage

ACCESS_TOKEN_COOKIE = "access_token"
REFRESH_TOKEN_COOKIE = "refresh_token"


def get_storage() -> StorageBackend:
    return LocalDiskStorage()


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    user_id = _decode_user_id_or_401(request.cookies.get(ACCESS_TOKEN_COOKIE))
    user = UserRepository(db).get_by_id(user_id)
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User no longer exists")
    return user


def _decode_user_id_or_401(token: str | None) -> int:
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    try:
        return decode_token(token)
    except PyJWTError as error:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token") from error
