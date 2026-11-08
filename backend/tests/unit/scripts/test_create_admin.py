import pytest

from app.core.security import verify_password
from app.repositories.credential_repository import CredentialRepository
from app.repositories.user_repository import UserRepository
from scripts import create_admin as create_admin_module
from scripts.create_admin import create_admin, main


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


def test_main_rejects_the_wrong_number_of_arguments():
    with pytest.raises(SystemExit) as exit_info:
        main(["admin", "admin@example.com"])

    assert "Usage" in str(exit_info.value.code)


def test_main_commits_the_admin_and_reports_it(db_session, monkeypatch, capsys):
    monkeypatch.setattr(create_admin_module, "SessionLocal", lambda: db_session)

    main(["admin", "admin@example.com", "correct horse"])

    assert UserRepository(db_session).get_by_username_or_email("admin").is_admin is True
    assert "admin (id 1) is an admin" in capsys.readouterr().out
