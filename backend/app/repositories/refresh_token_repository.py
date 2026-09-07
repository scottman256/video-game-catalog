from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.time import utc_now
from app.models.refresh_token import RefreshToken


class RefreshTokenRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def create(self, user_id: int, token_hash: str, expires_at: datetime) -> RefreshToken:
        token = RefreshToken(user_id=user_id, token_hash=token_hash, expires_at=expires_at)
        self._db.add(token)
        self._db.flush()
        return token

    def get_by_token_hash(self, token_hash: str) -> RefreshToken | None:
        stmt = select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        return self._db.scalar(stmt)

    def revoke(self, token: RefreshToken) -> None:
        token.revoked_at = utc_now()
        self._db.flush()
