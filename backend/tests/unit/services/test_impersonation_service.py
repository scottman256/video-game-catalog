import pytest

from app.core.security import create_impersonation_token
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.services.exceptions import ImpersonationError
from app.services.impersonation_service import ImpersonationService


def _make_user(db_session, username: str, is_admin: bool = False) -> User:
    users = UserRepository(db_session)
    return users.set_admin(users.create(username=username, email=f"{username}@example.com"), is_admin)


def test_admin_can_start_impersonating_a_regular_user(db_session):
    admin = _make_user(db_session, "admin", is_admin=True)
    target = _make_user(db_session, "scott")
    service = ImpersonationService(db_session)

    assumed, token = service.start(admin, target.id)

    assert assumed.id == target.id
    assert service.resolve(admin, token).id == target.id


def test_regular_user_cannot_impersonate(db_session):
    user = _make_user(db_session, "scott")
    target = _make_user(db_session, "other")

    with pytest.raises(ImpersonationError):
        ImpersonationService(db_session).start(user, target.id)


def test_admin_cannot_impersonate_another_admin(db_session):
    admin = _make_user(db_session, "admin", is_admin=True)
    other_admin = _make_user(db_session, "root", is_admin=True)

    with pytest.raises(ImpersonationError):
        ImpersonationService(db_session).start(admin, other_admin.id)


def test_start_rejects_missing_user(db_session):
    admin = _make_user(db_session, "admin", is_admin=True)

    with pytest.raises(ImpersonationError):
        ImpersonationService(db_session).start(admin, 999)


def test_resolve_returns_none_without_a_token(db_session):
    admin = _make_user(db_session, "admin", is_admin=True)

    assert ImpersonationService(db_session).resolve(admin, None) is None


def test_resolve_ignores_token_issued_to_a_different_admin(db_session):
    admin = _make_user(db_session, "admin", is_admin=True)
    other_admin = _make_user(db_session, "root", is_admin=True)
    target = _make_user(db_session, "scott")
    token = create_impersonation_token(other_admin.id, target.id)

    assert ImpersonationService(db_session).resolve(admin, token) is None


def test_resolve_ignores_token_once_signed_in_user_is_no_longer_admin(db_session):
    admin = _make_user(db_session, "admin", is_admin=True)
    target = _make_user(db_session, "scott")
    _, token = ImpersonationService(db_session).start(admin, target.id)
    UserRepository(db_session).set_admin(admin, False)

    assert ImpersonationService(db_session).resolve(admin, token) is None


def test_resolve_ignores_garbage_token(db_session):
    admin = _make_user(db_session, "admin", is_admin=True)

    assert ImpersonationService(db_session).resolve(admin, "not-a-token") is None


def test_list_impersonatable_users_excludes_admins(db_session):
    _make_user(db_session, "admin", is_admin=True)
    _make_user(db_session, "scott")

    users = ImpersonationService(db_session).list_impersonatable_users()

    assert [user.username for user in users] == ["scott"]
