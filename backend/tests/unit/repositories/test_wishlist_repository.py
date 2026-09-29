from decimal import Decimal

from app.repositories.game_repository import GameRepository
from app.repositories.system_repository import SystemRepository
from app.repositories.user_repository import UserRepository
from app.repositories.wishlist_repository import WishlistRepository


def _make_user_and_game(db_session):
    system_id = SystemRepository(db_session).create("NES", 1985).id
    user_id = UserRepository(db_session).create(username="scott", email="scott@example.com").id
    game_id = GameRepository(db_session).create("Mario", None, 1985, system_id, "E", user_id).id
    return user_id, game_id


def _make_other_user(db_session) -> int:
    return UserRepository(db_session).create(username="other", email="other@example.com").id


def test_create_and_get_by_id_loads_the_game(db_session):
    user_id, game_id = _make_user_and_game(db_session)
    repo = WishlistRepository(db_session)

    entry = repo.create(user_id, game_id, Decimal("29.99"))
    fetched = repo.get_by_id(entry.id)

    assert fetched.game.title == "Mario"
    assert fetched.target_price == Decimal("29.99")


def test_get_by_user_and_game(db_session):
    user_id, game_id = _make_user_and_game(db_session)
    repo = WishlistRepository(db_session)
    repo.create(user_id, game_id, None)

    assert repo.get_by_user_and_game(user_id, game_id) is not None
    assert repo.get_by_user_and_game(user_id, 999) is None


def test_list_for_user_only_returns_that_users_entries(db_session):
    user_id, game_id = _make_user_and_game(db_session)
    other_user_id = _make_other_user(db_session)
    repo = WishlistRepository(db_session)
    repo.create(user_id, game_id, None)

    assert len(repo.list_for_user(user_id)) == 1
    assert repo.list_for_user(other_user_id) == []


def test_list_game_ids_for_user(db_session):
    user_id, game_id = _make_user_and_game(db_session)
    other_user_id = _make_other_user(db_session)
    WishlistRepository(db_session).create(user_id, game_id, None)

    assert WishlistRepository(db_session).list_game_ids_for_user(user_id) == {game_id}
    assert WishlistRepository(db_session).list_game_ids_for_user(other_user_id) == set()


def test_update_target_price_can_clear_the_price(db_session):
    user_id, game_id = _make_user_and_game(db_session)
    repo = WishlistRepository(db_session)
    entry = repo.create(user_id, game_id, Decimal("10.00"))

    repo.update_target_price(entry, None)

    assert repo.get_by_id(entry.id).target_price is None


def test_delete_for_game_removes_every_users_entry(db_session):
    user_id, game_id = _make_user_and_game(db_session)
    other_user_id = _make_other_user(db_session)
    repo = WishlistRepository(db_session)
    repo.create(user_id, game_id, None)
    repo.create(other_user_id, game_id, None)

    repo.delete_for_game(game_id)

    assert repo.get_by_user_and_game(user_id, game_id) is None
    assert repo.get_by_user_and_game(other_user_id, game_id) is None
