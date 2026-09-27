from fastapi import Depends, HTTPException, Request, status
from jwt import PyJWTError
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.db.session import get_db
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.services.impersonation_service import ImpersonationService
from app.storage.base import StorageBackend
from app.storage.local_disk_storage import LocalDiskStorage

ACCESS_TOKEN_COOKIE = "access_token"
REFRESH_TOKEN_COOKIE = "refresh_token"
IMPERSONATION_COOKIE = "impersonation_token"


def get_storage() -> StorageBackend:
    return LocalDiskStorage()


def get_signed_in_user(request: Request, db: Session = Depends(get_db)) -> User:
    """The account that actually logged in, regardless of who an admin is acting as."""
    user_id = _decode_user_id_or_401(request.cookies.get(ACCESS_TOKEN_COOKIE))
    user = UserRepository(db).get_by_id(user_id)
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User no longer exists")
    return user


def get_current_user(
    request: Request, db: Session = Depends(get_db), signed_in: User = Depends(get_signed_in_user)
) -> User:
    """The account whose data is being read or changed — the assumed user while an admin impersonates."""
    token = request.cookies.get(IMPERSONATION_COOKIE)
    return ImpersonationService(db).resolve(signed_in, token) or signed_in


def get_current_admin(signed_in: User = Depends(get_signed_in_user)) -> User:
    if not signed_in.is_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin access required")
    return signed_in


def get_library_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.is_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin accounts do not have a game library")
    return current_user


def _decode_user_id_or_401(token: str | None) -> int:
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    try:
        return decode_token(token)
    except PyJWTError as error:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token") from error
