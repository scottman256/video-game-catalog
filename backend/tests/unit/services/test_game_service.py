import pytest

from app.models.user import User
from app.repositories.game_repository import GameRepository
from app.repositories.system_repository import SystemRepository
from app.repositories.user_repository import UserRepository
from app.services.exceptions import SystemNotFoundError
from app.services.game_service import GameService, can_manage_game_images, is_game_visible_to


def _make_user(db_session, username: str, is_admin: bool = False) -> User:
    users = UserRepository(db_session)
    return users.set_admin(users.create(username=username, email=f"{username}@example.com"), is_admin)


def _make_system(db_session) -> int:
    return SystemRepository(db_session).create("Nintendo Entertainment System", 1985).id


def _create(service: GameService, system_id: int, creator: User, title: str = "Mario"):
    return service.create_game(title, None, 1985, system_id, "E", creator=creator)


def test_games_submitted_by_regular_users_start_pending(db_session):
    submitter = _make_user(db_session, "scott")

    game = _create(GameService(db_session), _make_system(db_session), submitter)

    assert game.is_approved is False


def test_games_created_by_admins_are_approved_immediately(db_session):
    admin = _make_user(db_session, "admin", is_admin=True)

    game = _create(GameService(db_session), _make_system(db_session), admin)

    assert game.is_approved is True


def test_create_game_rejects_unknown_system(db_session):
    submitter = _make_user(db_session, "scott")

    with pytest.raises(SystemNotFoundError):
        _create(GameService(db_session), 999, submitter)


def test_pending_game_is_visible_only_to_submitter_and_admins(db_session):
    submitter = _make_user(db_session, "scott")
    other = _make_user(db_session, "other")
    admin = _make_user(db_session, "admin", is_admin=True)
    game = _create(GameService(db_session), _make_system(db_session), submitter)

    assert is_game_visible_to(game, submitter) is True
    assert is_game_visible_to(game, admin) is True
    assert is_game_visible_to(game, other) is False


def test_approved_game_is_visible_to_everyone(db_session):
    submitter = _make_user(db_session, "scott")
    other = _make_user(db_session, "other")
    game = _create(GameService(db_session), _make_system(db_session), submitter)
    GameRepository(db_session).approve(game)

    assert is_game_visible_to(game, other) is True


def test_only_submitter_and_admins_can_manage_images(db_session):
    submitter = _make_user(db_session, "scott")
    other = _make_user(db_session, "other")
    admin = _make_user(db_session, "admin", is_admin=True)
    game = _create(GameService(db_session), _make_system(db_session), submitter)

    assert can_manage_game_images(game, submitter) is True
    assert can_manage_game_images(game, admin) is True
    assert can_manage_game_images(game, other) is False


def test_get_visible_hides_other_users_pending_games(db_session):
    submitter = _make_user(db_session, "scott")
    other = _make_user(db_session, "other")
    service = GameService(db_session)
    game = _create(service, _make_system(db_session), submitter)

    assert service.get_visible(game.id, submitter).id == game.id
    assert service.get_visible(game.id, other) is None
    assert service.get_visible(999, submitter) is None


def test_search_includes_all_pending_games_for_admins(db_session):
    system_id = _make_system(db_session)
    submitter = _make_user(db_session, "scott")
    admin = _make_user(db_session, "admin", is_admin=True)
    other = _make_user(db_session, "other")
    service = GameService(db_session)
    _create(service, system_id, submitter)

    assert len(service.search("mario", admin)) == 1
    assert service.search("mario", other) == []
