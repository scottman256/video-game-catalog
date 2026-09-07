from datetime import timedelta

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import (
    create_access_token,
    generate_refresh_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)
from app.core.time import as_aware_utc, utc_now
from app.models.user import User
from app.repositories.credential_repository import CredentialRepository
from app.repositories.refresh_token_repository import RefreshTokenRepository
from app.repositories.user_repository import UserRepository
from app.services.exceptions import InvalidCredentialsError
from app.services.user_service import UserService

settings = get_settings()


class AuthService:
    def __init__(self, db: Session) -> None:
        self._users = UserRepository(db)
        self._credentials = CredentialRepository(db)
        self._refresh_tokens = RefreshTokenRepository(db)
        self._user_service = UserService(db)

    def register(self, username: str, email: str, password: str) -> User:
        self._user_service.ensure_username_and_email_available(username, email)
        user = self._users.create(username, email)
        self._credentials.create(user.id, hash_password(password))
        return user

    def authenticate(self, identifier: str, password: str) -> User:
        user = self._users.get_by_username_or_email(identifier)
        credential = self._credentials.get_by_user_id(user.id) if user else None
        if not user or not credential or not verify_password(password, credential.password_hash):
            raise InvalidCredentialsError("Invalid username/email or password")
        return user

    def issue_tokens(self, user_id: int) -> tuple[str, str]:
        access_token = create_access_token(user_id)
        refresh_token = generate_refresh_token()
        expires_at = utc_now() + timedelta(days=settings.refresh_token_ttl_days)
        self._refresh_tokens.create(user_id, hash_refresh_token(refresh_token), expires_at)
        return access_token, refresh_token

    def refresh(self, raw_refresh_token: str) -> tuple[str, str, int]:
        record = self._refresh_tokens.get_by_token_hash(hash_refresh_token(raw_refresh_token))
        if not record or record.revoked_at or as_aware_utc(record.expires_at) < utc_now():
            raise InvalidCredentialsError("Refresh token is invalid or expired")
        self._refresh_tokens.revoke(record)
        access_token, refresh_token = self.issue_tokens(record.user_id)
        return access_token, refresh_token, record.user_id

    def logout(self, raw_refresh_token: str) -> None:
        record = self._refresh_tokens.get_by_token_hash(hash_refresh_token(raw_refresh_token))
        if record and not record.revoked_at:
            self._refresh_tokens.revoke(record)
