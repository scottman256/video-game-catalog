import pytest

from app.services.auth_service import AuthService
from app.services.exceptions import DuplicateFieldError, InvalidCredentialsError


def test_register_creates_user_and_credential(db_session):
    user = AuthService(db_session).register("scott", "scott@example.com", "Sup3r$ecret")

    assert user.id is not None
    assert user.username == "scott"


def test_register_rejects_duplicate_username(db_session):
    service = AuthService(db_session)
    service.register("scott", "scott@example.com", "Sup3r$ecret")

    with pytest.raises(DuplicateFieldError):
        service.register("scott", "other@example.com", "Sup3r$ecret")


def test_authenticate_with_username_succeeds(db_session):
    service = AuthService(db_session)
    service.register("scott", "scott@example.com", "Sup3r$ecret")

    user = service.authenticate("scott", "Sup3r$ecret")

    assert user.username == "scott"


def test_authenticate_with_email_succeeds(db_session):
    service = AuthService(db_session)
    service.register("scott", "scott@example.com", "Sup3r$ecret")

    user = service.authenticate("scott@example.com", "Sup3r$ecret")

    assert user.username == "scott"


def test_authenticate_rejects_wrong_password(db_session):
    service = AuthService(db_session)
    service.register("scott", "scott@example.com", "Sup3r$ecret")

    with pytest.raises(InvalidCredentialsError):
        service.authenticate("scott", "wrong-password")


def test_authenticate_rejects_unknown_identifier(db_session):
    with pytest.raises(InvalidCredentialsError):
        AuthService(db_session).authenticate("nobody", "whatever")


def test_issue_tokens_returns_distinct_access_and_refresh_tokens(db_session):
    service = AuthService(db_session)
    user = service.register("scott", "scott@example.com", "Sup3r$ecret")

    access_token, refresh_token = service.issue_tokens(user.id)

    assert access_token != refresh_token


def test_refresh_rotates_the_refresh_token(db_session):
    service = AuthService(db_session)
    user = service.register("scott", "scott@example.com", "Sup3r$ecret")
    _, first_refresh_token = service.issue_tokens(user.id)

    _, second_refresh_token, user_id = service.refresh(first_refresh_token)

    assert user_id == user.id
    assert second_refresh_token != first_refresh_token
    with pytest.raises(InvalidCredentialsError):
        service.refresh(first_refresh_token)


def test_refresh_rejects_unknown_token(db_session):
    with pytest.raises(InvalidCredentialsError):
        AuthService(db_session).refresh("not-a-real-token")


def test_logout_revokes_the_refresh_token(db_session):
    service = AuthService(db_session)
    user = service.register("scott", "scott@example.com", "Sup3r$ecret")
    _, refresh_token = service.issue_tokens(user.id)

    service.logout(refresh_token)

    with pytest.raises(InvalidCredentialsError):
        service.refresh(refresh_token)
