from app.repositories.game_repository import GameRepository
from app.repositories.library_repository import LibraryRepository
from app.repositories.review_repository import ReviewRepository
from app.repositories.system_repository import SystemRepository
from app.repositories.user_repository import UserRepository


def _make_library_entry(db_session):
    system_id = SystemRepository(db_session).create("NES", 1985).id
    user_id = UserRepository(db_session).create(username="scott", email="scott@example.com").id
    game_id = GameRepository(db_session).create("Mario", None, 1985, system_id, "E", user_id).id
    return LibraryRepository(db_session).create(user_id, game_id, "digital", None)


def test_upsert_creates_then_updates(db_session):
    entry = _make_library_entry(db_session)
    repo = ReviewRepository(db_session)
    repo.upsert(entry.id, {"fun_factor": 8})

    review = repo.upsert(entry.id, {"fun_factor": 10, "graphics_performance": 6})

    assert review.fun_factor == 10
    assert review.graphics_performance == 6


def test_get_by_library_id_returns_none_when_missing(db_session):
    assert ReviewRepository(db_session).get_by_library_id(999) is None


def test_list_for_user_only_returns_that_users_reviews(db_session):
    entry = _make_library_entry(db_session)
    repo = ReviewRepository(db_session)
    repo.upsert(entry.id, {"fun_factor": 10})
    other_user_id = UserRepository(db_session).create(username="other", email="other@example.com").id

    assert len(repo.list_for_user(entry.user_id)) == 1
    assert repo.list_for_user(other_user_id) == []


def test_list_for_game_only_returns_reviews_for_that_game(db_session):
    entry = _make_library_entry(db_session)
    ReviewRepository(db_session).upsert(entry.id, {"fun_factor": 10})

    reviews = ReviewRepository(db_session).list_for_game(entry.game_id)

    assert len(reviews) == 1
