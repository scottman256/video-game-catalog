import hashlib
import secrets

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

from app.core.config import get_settings
from app.core.time import utc_now

_hasher = PasswordHasher()
settings = get_settings()


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _hasher.verify(password_hash, password)
    except VerifyMismatchError:
        return False


ACCESS_TOKEN_TYPE = "access"
IMPERSONATION_TOKEN_TYPE = "impersonation"


def create_access_token(user_id: int) -> str:
    expires_at = utc_now().timestamp() + settings.access_token_ttl_minutes * 60
    payload = {"sub": str(user_id), "exp": int(expires_at), "typ": ACCESS_TOKEN_TYPE}
    return _encode(payload)


def decode_token(token: str) -> int:
    """Tokens issued before the `typ` claim existed are access tokens."""
    payload = _decode(token)
    if payload.get("typ", ACCESS_TOKEN_TYPE) != ACCESS_TOKEN_TYPE:
        raise jwt.InvalidTokenError("Not an access token")
    return int(payload["sub"])


def create_impersonation_token(admin_id: int, target_user_id: int) -> str:
    expires_at = utc_now().timestamp() + settings.impersonation_ttl_minutes * 60
    payload = {"sub": str(target_user_id), "act": str(admin_id), "exp": int(expires_at), "typ": IMPERSONATION_TOKEN_TYPE}
    return _encode(payload)


def decode_impersonation_token(token: str) -> tuple[int, int]:
    """Returns (admin_id, target_user_id)."""
    payload = _decode(token)
    if payload.get("typ") != IMPERSONATION_TOKEN_TYPE:
        raise jwt.InvalidTokenError("Not an impersonation token")
    return int(payload["act"]), int(payload["sub"])


def _encode(payload: dict) -> str:
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def _decode(token: str) -> dict:
    return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])


def generate_refresh_token() -> str:
    return secrets.token_urlsafe(32)


def hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()
