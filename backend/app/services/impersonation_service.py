from jwt import PyJWTError
from sqlalchemy.orm import Session

from app.core.security import create_impersonation_token, decode_impersonation_token
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.services.exceptions import ImpersonationError


class ImpersonationService:
    """Lets an admin act as a regular user. The admin stays signed in as themselves throughout."""

    def __init__(self, db: Session) -> None:
        self._users = UserRepository(db)

    def list_impersonatable_users(self) -> list[User]:
        return self._users.list_non_admins()

    def start(self, admin: User, target_user_id: int) -> tuple[User, str]:
        target = self._users.get_by_id(target_user_id)
        if not admin.is_admin or not target or target.is_admin:
            raise ImpersonationError("That account cannot be assumed")
        return target, create_impersonation_token(admin.id, target.id)

    def resolve(self, signed_in_user: User, token: str | None) -> User | None:
        """The user the signed-in admin is acting as, or None when not impersonating."""
        target_id = self._target_id_for(signed_in_user, token)
        target = self._users.get_by_id(target_id) if target_id else None
        return target if target and not target.is_admin else None

    def _target_id_for(self, signed_in_user: User, token: str | None) -> int | None:
        if not token or not signed_in_user.is_admin:
            return None
        try:
            admin_id, target_id = decode_impersonation_token(token)
        except PyJWTError:
            return None
        return target_id if admin_id == signed_in_user.id else None
