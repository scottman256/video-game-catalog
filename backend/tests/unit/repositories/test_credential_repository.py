import pytest
from sqlalchemy.exc import IntegrityError

from app.repositories.credential_repository import CredentialRepository
from app.repositories.user_repository import UserRepository


def test_create_and_get_by_user_id(db_session):
    user = UserRepository(db_session).create(username="scott", email="scott@example.com")
    repo = CredentialRepository(db_session)

    repo.create(user_id=user.id, password_hash="hashed")
    fetched = repo.get_by_user_id(user.id)

    assert fetched is not None
    assert fetched.password_hash == "hashed"


def test_get_by_user_id_returns_none_when_missing(db_session):
    repo = CredentialRepository(db_session)

    assert repo.get_by_user_id(999) is None


def test_create_with_nonexistent_user_id_violates_foreign_key(db_session):
    repo = CredentialRepository(db_session)

    with pytest.raises(IntegrityError):
        repo.create(user_id=999, password_hash="hashed")
