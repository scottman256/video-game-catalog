from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.api.deps import ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, get_current_user
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
    _issue_and_set_cookies(service, response, user.id)
    return user


@router.post("/login", response_model=UserOut)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)) -> User:
    service = AuthService(db)
    try:
        user = service.authenticate(payload.identifier, payload.password)
    except InvalidCredentialsError as error:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, str(error)) from error
    _issue_and_set_cookies(service, response, user.id)
    return user


@router.post("/refresh", response_model=UserOut)
def refresh(request: Request, response: Response, db: Session = Depends(get_db)) -> User:
    raw_refresh_token = request.cookies.get(REFRESH_TOKEN_COOKIE)
    if not raw_refresh_token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    service = AuthService(db)
    try:
        access_token, refresh_token, user_id = service.refresh(raw_refresh_token)
    except InvalidCredentialsError as error:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, str(error)) from error
    _set_auth_cookies(response, access_token, refresh_token)
    return UserRepository(db).get_by_id(user_id)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: Request, response: Response, db: Session = Depends(get_db)) -> None:
    raw_refresh_token = request.cookies.get(REFRESH_TOKEN_COOKIE)
    if raw_refresh_token:
        AuthService(db).logout(raw_refresh_token)
    response.delete_cookie(ACCESS_TOKEN_COOKIE)
    response.delete_cookie(REFRESH_TOKEN_COOKIE)


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user


def _issue_and_set_cookies(service: AuthService, response: Response, user_id: int) -> None:
    access_token, refresh_token = service.issue_tokens(user_id)
    _set_auth_cookies(response, access_token, refresh_token)


def _set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    response.set_cookie(
        ACCESS_TOKEN_COOKIE,
        access_token,
        httponly=True,
        samesite="lax",
        secure=settings.is_production,
        max_age=settings.access_token_ttl_minutes * 60,
    )
    response.set_cookie(
        REFRESH_TOKEN_COOKIE,
        refresh_token,
        httponly=True,
        samesite="lax",
        secure=settings.is_production,
        max_age=settings.refresh_token_ttl_days * 86400,
    )
