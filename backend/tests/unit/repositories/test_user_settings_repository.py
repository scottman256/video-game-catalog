from app.repositories.user_repository import UserRepository
from app.repositories.user_settings_repository import UserSettingsRepository


def _make_user(db_session) -> int:
    return UserRepository(db_session).create(username="scott", email="scott@example.com").id


def test_get_by_user_id_returns_none_when_missing(db_session):
    assert UserSettingsRepository(db_session).get_by_user_id(999) is None


def test_upsert_dark_mode_creates_when_missing(db_session):
    user_id = _make_user(db_session)
    repo = UserSettingsRepository(db_session)

    settings = repo.upsert_dark_mode(user_id, True)

    assert settings.dark_mode is True
    assert repo.get_by_user_id(user_id).dark_mode is True


def test_upsert_dark_mode_updates_existing_row(db_session):
    user_id = _make_user(db_session)
    repo = UserSettingsRepository(db_session)
    repo.upsert_dark_mode(user_id, True)

    repo.upsert_dark_mode(user_id, False)

    assert repo.get_by_user_id(user_id).dark_mode is False
