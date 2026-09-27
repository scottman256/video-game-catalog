from app.repositories.game_repository import GameRepository
from app.repositories.system_repository import SystemRepository
from app.repositories.user_repository import UserRepository


def _make_system(db_session) -> int:
    return SystemRepository(db_session).create("Nintendo Entertainment System", 1985).id


def _make_user(db_session) -> int:
    return UserRepository(db_session).create(username="scott", email="scott@example.com").id


def test_create_and_get_by_id(db_session):
    system_id = _make_system(db_session)
    user_id = _make_user(db_session)
    repo = GameRepository(db_session)

    game = repo.create("Super Mario Bros.", "A classic platformer", 1985, system_id, "E", user_id)
    fetched = repo.get_by_id(game.id)

    assert fetched is not None
    assert fetched.title == "Super Mario Bros."


def test_get_by_id_returns_none_when_missing(db_session):
    assert GameRepository(db_session).get_by_id(999) is None


def test_search_by_title_is_case_insensitive_partial_match(db_session):
    system_id = _make_system(db_session)
    user_id = _make_user(db_session)
    repo = GameRepository(db_session)
    repo.create("Super Mario Bros.", None, 1985, system_id, "E", user_id)
    repo.create("The Legend of Zelda", None, 1986, system_id, "E", user_id)

    results = repo.search_by_title("mario")

    assert len(results) == 1
    assert results[0].title == "Super Mario Bros."


def test_search_by_title_hides_other_users_pending_games(db_session):
    system_id = _make_system(db_session)
    submitter_id = _make_user(db_session)
    viewer_id = UserRepository(db_session).create(username="other", email="other@example.com").id
    repo = GameRepository(db_session)
    repo.create("Mario Approved", None, 1985, system_id, "E", submitter_id)
    repo.create("Mario Pending", None, 1985, system_id, "E", submitter_id, is_approved=False)

    viewer_titles = [game.title for game in repo.search_by_title("mario", viewer_id)]
    submitter_titles = [game.title for game in repo.search_by_title("mario", submitter_id)]

    assert viewer_titles == ["Mario Approved"]
    assert submitter_titles == ["Mario Approved", "Mario Pending"]


def test_list_all_filters_by_approval_status(db_session):
    system_id = _make_system(db_session)
    user_id = _make_user(db_session)
    repo = GameRepository(db_session)
    repo.create("Approved Game", None, 1985, system_id, "E", user_id)
    repo.create("Pending Game", None, 1985, system_id, "E", user_id, is_approved=False)

    assert len(repo.list_all("", None)) == 2
    assert [game.title for game in repo.list_all("", False)] == ["Pending Game"]
    assert [game.title for game in repo.list_all("", True)] == ["Approved Game"]


def test_list_pending_oldest_first_excludes_approved_games(db_session):
    system_id = _make_system(db_session)
    user_id = _make_user(db_session)
    repo = GameRepository(db_session)
    first = repo.create("Zelda", None, 1986, system_id, "E", user_id, is_approved=False)
    repo.create("Approved", None, 1985, system_id, "E", user_id)
    second = repo.create("Adventure", None, 1987, system_id, "E", user_id, is_approved=False)

    assert [game.id for game in repo.list_pending_oldest_first()] == [first.id, second.id]


def test_update_applies_changes(db_session):
    system_id = _make_system(db_session)
    user_id = _make_user(db_session)
    repo = GameRepository(db_session)
    game = repo.create("Super Mario Bros", None, 1985, system_id, "E", user_id)

    updated = repo.update(game, {"title": "Super Mario Bros.", "summary": "Classic"})

    assert updated.title == "Super Mario Bros."
    assert updated.summary == "Classic"


def test_approve_marks_game_approved(db_session):
    system_id = _make_system(db_session)
    user_id = _make_user(db_session)
    repo = GameRepository(db_session)
    game = repo.create("Mario", None, 1985, system_id, "E", user_id, is_approved=False)

    assert repo.approve(game).is_approved is True


def test_delete_removes_the_game(db_session):
    repo = GameRepository(db_session)
    game = repo.create("Mario", None, 1985, _make_system(db_session), "E", _make_user(db_session))

    repo.delete(game)

    assert repo.get_by_id(game.id) is None
