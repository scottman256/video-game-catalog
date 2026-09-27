import pytest

from app.repositories.game_repository import GameRepository
from app.repositories.system_repository import SystemRepository
from app.repositories.user_repository import UserRepository
from app.services.admin_game_service import AdminGameService
from app.services.exceptions import GameNotFoundError, SystemNotFoundError


def _make_pending_game(db_session, title: str = "Super Mario Bros"):
    system_id = SystemRepository(db_session).create("Nintendo Entertainment System", 1985).id
    user_id = UserRepository(db_session).create(username="scott", email="scott@example.com").id
    return GameRepository(db_session).create(title, "Original", 1985, system_id, "E", user_id, is_approved=False)


def test_get_game_raises_when_missing(db_session):
    with pytest.raises(GameNotFoundError):
        AdminGameService(db_session).get_game(999)


def test_update_game_changes_only_the_fields_sent(db_session):
    game = _make_pending_game(db_session)

    updated = AdminGameService(db_session).update_game(game.id, {"title": "Super Mario Bros."})

    assert updated.title == "Super Mario Bros."
    assert updated.summary == "Original"


def test_update_game_ignores_cleared_required_fields_but_allows_clearing_summary(db_session):
    game = _make_pending_game(db_session)

    updated = AdminGameService(db_session).update_game(game.id, {"title": None, "summary": None})

    assert updated.title == "Super Mario Bros"
    assert updated.summary is None


def test_update_game_rejects_unknown_system(db_session):
    game = _make_pending_game(db_session)

    with pytest.raises(SystemNotFoundError):
        AdminGameService(db_session).update_game(game.id, {"system_id": 999})


def test_approve_game_saves_edits_and_approves(db_session):
    game = _make_pending_game(db_session)

    approved = AdminGameService(db_session).approve_game(game.id, {"release_year": 1986})

    assert approved.is_approved is True
    assert approved.release_year == 1986


def test_approved_game_leaves_the_pending_list(db_session):
    game = _make_pending_game(db_session)
    service = AdminGameService(db_session)

    service.approve_game(game.id, {})

    assert service.list_pending() == []
