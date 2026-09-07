from decimal import Decimal

import pytest

from app.repositories.game_repository import GameRepository
from app.repositories.review_repository import ReviewRepository
from app.repositories.system_repository import SystemRepository
from app.repositories.user_repository import UserRepository
from app.services.exceptions import DuplicateFieldError, GameNotFoundError
from app.services.library_service import LibraryService


def _setup(db_session):
    system_id = SystemRepository(db_session).create("NES", 1985).id
    user_id = UserRepository(db_session).create(username="scott", email="scott@example.com").id
    return system_id, user_id


def test_add_to_library_rejects_duplicate(db_session):
    system_id, user_id = _setup(db_session)
    game_id = GameRepository(db_session).create("Mario", None, 1985, system_id, "E", user_id).id
    service = LibraryService(db_session)
    service.add_to_library(user_id, game_id, "digital", None)

    with pytest.raises(DuplicateFieldError):
        service.add_to_library(user_id, game_id, "physical", Decimal("10.00"))


def test_add_to_library_rejects_nonexistent_game(db_session):
    _, user_id = _setup(db_session)

    with pytest.raises(GameNotFoundError):
        LibraryService(db_session).add_to_library(user_id, 999, "digital", None)


def test_sort_by_rating_puts_unrated_games_last(db_session):
    system_id, user_id = _setup(db_session)
    games = GameRepository(db_session)
    reviews = ReviewRepository(db_session)
    service = LibraryService(db_session)
    high_entry = service.add_to_library(
        user_id, games.create("High Score Game", None, 1990, system_id, "E", user_id).id, "digital", None
    )
    low_entry = service.add_to_library(
        user_id, games.create("Low Score Game", None, 1990, system_id, "E", user_id).id, "digital", None
    )
    service.add_to_library(
        user_id, games.create("Unrated Game", None, 1990, system_id, "E", user_id).id, "digital", None
    )
    reviews.upsert(high_entry.id, {"fun_factor": 10})
    reviews.upsert(low_entry.id, {"fun_factor": 2})

    sorted_desc = service.list_sorted(user_id, "rating", "desc")

    assert [entry.game.title for entry in sorted_desc] == [
        "High Score Game",
        "Low Score Game",
        "Unrated Game",
    ]


def test_sort_by_title_ascending(db_session):
    system_id, user_id = _setup(db_session)
    games = GameRepository(db_session)
    service = LibraryService(db_session)
    b_id = games.create("B Game", None, 1990, system_id, "E", user_id).id
    a_id = games.create("A Game", None, 1990, system_id, "E", user_id).id
    service.add_to_library(user_id, b_id, "digital", None)
    service.add_to_library(user_id, a_id, "digital", None)

    sorted_entries = service.list_sorted(user_id, "title", "asc")

    assert [entry.game.title for entry in sorted_entries] == ["A Game", "B Game"]
