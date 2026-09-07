import pytest

from app.repositories.user_repository import UserRepository
from app.services.exceptions import DuplicateFieldError
from app.services.user_service import UserService


def test_allows_available_username_and_email(db_session):
    UserService(db_session).ensure_username_and_email_available("scott", "scott@example.com")


def test_rejects_duplicate_username(db_session):
    UserRepository(db_session).create(username="scott", email="scott@example.com")

    with pytest.raises(DuplicateFieldError) as excinfo:
        UserService(db_session).ensure_username_and_email_available("scott", "new@example.com")

    assert excinfo.value.field == "username"


def test_rejects_duplicate_email(db_session):
    UserRepository(db_session).create(username="scott", email="scott@example.com")

    with pytest.raises(DuplicateFieldError) as excinfo:
        UserService(db_session).ensure_username_and_email_available("newname", "scott@example.com")

    assert excinfo.value.field == "email"
