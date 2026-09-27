import pytest
from sqlalchemy.exc import IntegrityError

from app.repositories.user_repository import UserRepository


def test_create_and_get_by_id(db_session):
    repo = UserRepository(db_session)
    user = repo.create(username="scott", email="scott@example.com")

    fetched = repo.get_by_id(user.id)

    assert fetched is not None
    assert fetched.username == "scott"


def test_get_by_username_or_email_matches_either(db_session):
    repo = UserRepository(db_session)
    created = repo.create(username="scott", email="scott@example.com")

    by_username = repo.get_by_username_or_email("scott")
    by_email = repo.get_by_username_or_email("scott@example.com")

    assert by_username.id == created.id
    assert by_email.id == created.id


def test_get_by_username_or_email_returns_none_when_missing(db_session):
    repo = UserRepository(db_session)

    assert repo.get_by_username_or_email("nobody") is None


def test_username_and_email_exist_checks(db_session):
    repo = UserRepository(db_session)
    repo.create(username="scott", email="scott@example.com")

    assert repo.username_exists("scott") is True
    assert repo.email_exists("scott@example.com") is True
    assert repo.username_exists("nobody") is False
    assert repo.email_exists("nobody@example.com") is False


def test_duplicate_username_raises_integrity_error(db_session):
    repo = UserRepository(db_session)
    repo.create(username="scott", email="scott@example.com")

    with pytest.raises(IntegrityError):
        repo.create(username="scott", email="other@example.com")


def test_duplicate_email_raises_integrity_error(db_session):
    repo = UserRepository(db_session)
    repo.create(username="scott", email="scott@example.com")

    with pytest.raises(IntegrityError):
        repo.create(username="other", email="scott@example.com")


def test_list_non_admins_excludes_admins_and_orders_by_username(db_session):
    repo = UserRepository(db_session)
    repo.create(username="zelda", email="zelda@example.com")
    admin = repo.create(username="admin", email="admin@example.com")
    repo.set_admin(admin, True)
    repo.create(username="link", email="link@example.com")

    assert [user.username for user in repo.list_non_admins()] == ["link", "zelda"]
