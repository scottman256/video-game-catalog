from fastapi import Request, Response
from sqlalchemy.orm import Session

from app.api.deps import IMPERSONATION_COOKIE
from app.core.config import get_settings
from app.models.user import User
from app.schemas.user import UserOut
from app.services.impersonation_service import ImpersonationService

settings = get_settings()


def set_http_only_cookie(response: Response, name: str, value: str, max_age_seconds: int) -> None:
    response.set_cookie(
        name, value, httponly=True, samesite="lax", secure=settings.is_production, max_age=max_age_seconds
    )


def session_for(db: Session, request: Request, signed_in: User) -> UserOut:
    acting_as = ImpersonationService(db).resolve(signed_in, request.cookies.get(IMPERSONATION_COOKIE))
    return UserOut.for_session(acting_as or signed_in, signed_in)
