from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.api.cookies import session_for, set_http_only_cookie
from app.api.deps import (
    ACCESS_TOKEN_COOKIE,
    IMPERSONATION_COOKIE,
    REFRESH_TOKEN_COOKIE,
    get_current_user,
    get_signed_in_user,
)
from app.core.config import get_settings
from app.db.session import get_db
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.auth import LoginRequest, RegisterRequest
from app.schemas.user import UserOut
from app.services.auth_service import AuthService
from app.services.exceptions import DuplicateFieldError, InvalidCredentialsError

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, response: Response, db: Session = Depends(get_db)) -> User:
    service = AuthService(db)
    try:
        user = service.register(payload.username, payload.email, payload.password)
    except DuplicateFieldError as error:
        raise HTTPException(status.HTTP_409_CONFLICT, {"field": error.field, "message": error.message}) from error
    _start_fresh_session(service, response, user.id)
    return user


@router.post("/login", response_model=UserOut)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)) -> User:
    service = AuthService(db)
    try:
        user = service.authenticate(payload.identifier, payload.password)
    except InvalidCredentialsError as error:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, str(error)) from error
    _start_fresh_session(service, response, user.id)
    return user


@router.post("/refresh", response_model=UserOut)
def refresh(request: Request, response: Response, db: Session = Depends(get_db)) -> UserOut:
    raw_refresh_token = request.cookies.get(REFRESH_TOKEN_COOKIE)
    if not raw_refresh_token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    try:
        access_token, refresh_token, user_id = AuthService(db).refresh(raw_refresh_token)
    except InvalidCredentialsError as error:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, str(error)) from error
    _set_auth_cookies(response, access_token, refresh_token)
    return session_for(db, request, UserRepository(db).get_by_id(user_id))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: Request, response: Response, db: Session = Depends(get_db)) -> None:
    raw_refresh_token = request.cookies.get(REFRESH_TOKEN_COOKIE)
    if raw_refresh_token:
        AuthService(db).logout(raw_refresh_token)
    for cookie in (ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, IMPERSONATION_COOKIE):
        response.delete_cookie(cookie)


@router.get("/me", response_model=UserOut)
def me(
    current_user: User = Depends(get_current_user), signed_in: User = Depends(get_signed_in_user)
) -> UserOut:
    return UserOut.for_session(current_user, signed_in)


def _start_fresh_session(service: AuthService, response: Response, user_id: int) -> None:
    access_token, refresh_token = service.issue_tokens(user_id)
    _set_auth_cookies(response, access_token, refresh_token)
    response.delete_cookie(IMPERSONATION_COOKIE)


def _set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    set_http_only_cookie(response, ACCESS_TOKEN_COOKIE, access_token, settings.access_token_ttl_minutes * 60)
    set_http_only_cookie(response, REFRESH_TOKEN_COOKIE, refresh_token, settings.refresh_token_ttl_days * 86400)
