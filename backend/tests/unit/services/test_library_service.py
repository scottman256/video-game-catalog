from datetime import date
from decimal import Decimal

import pytest

from app.repositories.game_repository import GameRepository
from app.repositories.review_repository import ReviewRepository
from app.repositories.system_repository import SystemRepository
from app.repositories.user_repository import UserRepository
from app.repositories.wishlist_repository import WishlistRepository
from app.services.exceptions import DuplicateFieldError, GameNotFoundError, InvalidPlayProgressError
from app.services.library_service import LibraryService, PlayProgress, validate_play_progress


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


def test_remove_entry_also_removes_its_review(db_session):
    system_id, user_id = _setup(db_session)
    game_id = GameRepository(db_session).create("Mario", None, 1985, system_id, "E", user_id).id
    service = LibraryService(db_session)
    entry = service.add_to_library(user_id, game_id, "digital", None)
    ReviewRepository(db_session).upsert(entry.id, {"fun_factor": 8})

    service.remove_entry(service.get_library_entry(entry.id))
    db_session.commit()

    assert service.get_library_entry(entry.id) is None
    assert ReviewRepository(db_session).get_by_library_id(entry.id) is None


def test_add_to_library_takes_the_game_off_the_wishlist(db_session):
    system_id, user_id = _setup(db_session)
    game_id = GameRepository(db_session).create("Mario", None, 1985, system_id, "E", user_id).id
    wishlist = WishlistRepository(db_session)
    wishlist.create(user_id, game_id, None)

    LibraryService(db_session).add_to_library(user_id, game_id, "digital", None)

    assert wishlist.get_by_user_and_game(user_id, game_id) is None


def test_update_play_progress_saves_completion_dates_and_hours(db_session):
    system_id, user_id = _setup(db_session)
    game_id = GameRepository(db_session).create("Mario", None, 1985, system_id, "E", user_id).id
    service = LibraryService(db_session)
    entry = service.add_to_library(user_id, game_id, "digital", None)
    progress = PlayProgress(date(2026, 9, 1), date(2026, 9, 1), Decimal("12.5"))

    updated = service.update_play_progress(entry, progress)

    assert (updated.completed_on, updated.fully_completed_on, updated.hours_played) == (
        date(2026, 9, 1),
        date(2026, 9, 1),
        Decimal("12.5"),
    )


def test_hours_can_be_logged_without_completing_the_game():
    validate_play_progress(PlayProgress(None, None, Decimal("3")))


def test_completed_without_100_percent_is_valid():
    validate_play_progress(PlayProgress(date(2026, 9, 1), None, None))


def test_100_percent_requires_the_game_to_be_completed():
    progress = PlayProgress(None, date(2026, 9, 1), None)

    with pytest.raises(InvalidPlayProgressError, match="must be completed"):
        validate_play_progress(progress)


def test_100_percent_date_cannot_be_before_the_completion_date():
    progress = PlayProgress(date(2026, 9, 10), date(2026, 9, 9), None)

    with pytest.raises(InvalidPlayProgressError, match="can't be before"):
        validate_play_progress(progress)

