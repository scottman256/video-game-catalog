from app.core.security import verify_password
from app.repositories.credential_repository import CredentialRepository
from app.repositories.user_repository import UserRepository
from scripts.create_admin import create_admin


def test_create_admin_creates_new_admin_with_password(db_session):
    admin = create_admin(db_session, "admin", "admin@example.com", "correct horse")

    credential = CredentialRepository(db_session).get_by_user_id(admin.id)
    assert admin.is_admin is True
    assert verify_password("correct horse", credential.password_hash) is True


def test_create_admin_promotes_existing_user_without_changing_password(db_session):
    existing = UserRepository(db_session).create(username="scott", email="scott@example.com")

    promoted = create_admin(db_session, "scott", "ignored@example.com", "new password")

    assert promoted.id == existing.id
    assert promoted.is_admin is True
    assert CredentialRepository(db_session).get_by_user_id(existing.id) is None
