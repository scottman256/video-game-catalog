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
