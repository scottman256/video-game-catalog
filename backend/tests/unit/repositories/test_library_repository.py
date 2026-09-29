from datetime import date
from decimal import Decimal

from app.repositories.game_repository import GameRepository
from app.repositories.library_repository import LibraryRepository
from app.repositories.system_repository import SystemRepository
from app.repositories.user_repository import UserRepository


def _make_user_and_game(db_session):
    system_id = SystemRepository(db_session).create("NES", 1985).id
    user_id = UserRepository(db_session).create(username="scott", email="scott@example.com").id
    game_id = GameRepository(db_session).create("Mario", None, 1985, system_id, "E", user_id).id
    return user_id, game_id


def test_create_and_get_by_id(db_session):
    user_id, game_id = _make_user_and_game(db_session)
    repo = LibraryRepository(db_session)

    entry = repo.create(user_id, game_id, "digital", None)
    fetched = repo.get_by_id(entry.id)

    assert fetched is not None
    assert fetched.game.title == "Mario"


def test_get_by_user_and_game(db_session):
    user_id, game_id = _make_user_and_game(db_session)
    repo = LibraryRepository(db_session)
    repo.create(user_id, game_id, "digital", None)

    assert repo.get_by_user_and_game(user_id, game_id) is not None
    assert repo.get_by_user_and_game(user_id, 999) is None


def test_list_for_user_only_returns_that_users_entries(db_session):
    user_id, game_id = _make_user_and_game(db_session)
    other_user_id = UserRepository(db_session).create(username="other", email="other@example.com").id
    repo = LibraryRepository(db_session)
    repo.create(user_id, game_id, "digital", None)

    assert len(repo.list_for_user(user_id)) == 1
    assert len(repo.list_for_user(other_user_id)) == 0


def test_list_game_ids_for_user_returns_only_owned_games(db_session):
    user_id, game_id = _make_user_and_game(db_session)
    other_user_id = UserRepository(db_session).create(username="other", email="other@example.com").id
    repo = LibraryRepository(db_session)
    repo.create(user_id, game_id, "digital", None)

    assert repo.list_game_ids_for_user(user_id) == {game_id}
    assert repo.list_game_ids_for_user(other_user_id) == set()


def test_count_for_user_counts_only_that_users_entries(db_session):
    user_id, game_id = _make_user_and_game(db_session)
    other_user_id = UserRepository(db_session).create(username="other", email="other@example.com").id
    repo = LibraryRepository(db_session)
    repo.create(user_id, game_id, "digital", None)

    assert repo.count_for_user(user_id) == 1
    assert repo.count_for_user(other_user_id) == 0


def test_count_distinct_systems_for_user(db_session):
    systems = SystemRepository(db_session)
    nes_id = systems.create("NES", 1985).id
    snes_id = systems.create("SNES", 1991).id
    user_id = UserRepository(db_session).create(username="scott", email="scott@example.com").id
    games = GameRepository(db_session)
    repo = LibraryRepository(db_session)
    for title, system_id in [("Mario", nes_id), ("Zelda", nes_id), ("Metroid", snes_id)]:
        game_id = games.create(title, None, 1990, system_id, "E", user_id).id
        repo.create(user_id, game_id, "digital", None)

    assert repo.count_distinct_systems_for_user(user_id) == 2


def test_delete_removes_entry(db_session):
    user_id, game_id = _make_user_and_game(db_session)
    repo = LibraryRepository(db_session)
    entry = repo.create(user_id, game_id, "digital", None)

    repo.delete(entry)

    assert repo.get_by_id(entry.id) is None


def test_delete_for_game_removes_every_users_entry_for_that_game_only(db_session):
    user_id, game_id = _make_user_and_game(db_session)
    other_user_id = UserRepository(db_session).create(username="other", email="other@example.com").id
    other_game_id = GameRepository(db_session).create("Zelda", None, 1986, 1, "E", user_id).id
    repo = LibraryRepository(db_session)
    for owner_id in (user_id, other_user_id):
        repo.create(owner_id, game_id, "digital", None)
    repo.create(user_id, other_game_id, "digital", None)

    repo.delete_for_game(game_id)

    assert repo.list_game_ids_for_user(user_id) == {other_game_id}
    assert repo.list_game_ids_for_user(other_user_id) == set()


def test_update_play_progress_sets_and_clears_every_field(db_session):
    user_id, game_id = _make_user_and_game(db_session)
    repo = LibraryRepository(db_session)
    entry = repo.create(user_id, game_id, "digital", None)

    repo.update_play_progress(entry, date(2026, 9, 1), date(2026, 9, 20), Decimal("42.5"))
    saved = repo.get_by_id(entry.id)
    assert (saved.completed_on, saved.fully_completed_on, saved.hours_played) == (
        date(2026, 9, 1),
        date(2026, 9, 20),
        Decimal("42.5"),
    )

    repo.update_play_progress(entry, None, None, None)
    cleared = repo.get_by_id(entry.id)
    assert (cleared.completed_on, cleared.fully_completed_on, cleared.hours_played) == (None, None, None)
