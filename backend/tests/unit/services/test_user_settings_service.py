from app.repositories.user_repository import UserRepository
from app.services.user_settings_service import UserSettingsService


def _make_user(db_session) -> int:
    return UserRepository(db_session).create(username="scott", email="scott@example.com").id


def test_get_dark_mode_defaults_to_false_when_no_settings_saved(db_session):
    user_id = _make_user(db_session)

    assert UserSettingsService(db_session).get_dark_mode(user_id) is False


def test_set_dark_mode_persists_and_is_read_back(db_session):
    user_id = _make_user(db_session)
    service = UserSettingsService(db_session)

    service.set_dark_mode(user_id, True)

    assert service.get_dark_mode(user_id) is True
