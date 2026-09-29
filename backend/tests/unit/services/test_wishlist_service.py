from decimal import Decimal

import pytest

from app.repositories.game_repository import GameRepository
from app.repositories.library_repository import LibraryRepository
from app.repositories.system_repository import SystemRepository
from app.repositories.user_repository import UserRepository
from app.repositories.wishlist_repository import WishlistRepository
from app.services.exceptions import DuplicateFieldError, GameNotFoundError
from app.services.wishlist_service import WishlistService


@pytest.fixture
def player(db_session):
    """A player, a game they submitted, and a system to create more games on."""
    system_id = SystemRepository(db_session).create("NES", 1985).id
    user_id = UserRepository(db_session).create(username="scott", email="scott@example.com").id
    game_id = GameRepository(db_session).create("Mario", None, 1985, system_id, "E", user_id).id
    return {"user_id": user_id, "game_id": game_id, "system_id": system_id}


def test_add_to_wishlist_stores_the_target_price(db_session, player):
    entry = WishlistService(db_session).add_to_wishlist(player["user_id"], player["game_id"], Decimal("19.99"))

    assert entry.target_price == Decimal("19.99")


def test_add_to_wishlist_rejects_nonexistent_game(db_session, player):
    service = WishlistService(db_session)

    with pytest.raises(GameNotFoundError):
        service.add_to_wishlist(player["user_id"], 999, None)


def test_add_to_wishlist_rejects_another_players_pending_game(db_session, player):
    pending_game_id = GameRepository(db_session).create(
        "Pending", None, 1990, player["system_id"], "E", player["user_id"], is_approved=False
    ).id
    other_user_id = UserRepository(db_session).create(username="other", email="other@example.com").id
    service = WishlistService(db_session)

    with pytest.raises(GameNotFoundError):
        service.add_to_wishlist(other_user_id, pending_game_id, None)


def test_add_to_wishlist_rejects_a_game_already_owned(db_session, player):
    LibraryRepository(db_session).create(player["user_id"], player["game_id"], "digital", None)
    service = WishlistService(db_session)

    with pytest.raises(DuplicateFieldError, match="already own"):
        service.add_to_wishlist(player["user_id"], player["game_id"], None)


def test_add_to_wishlist_rejects_duplicate(db_session, player):
    service = WishlistService(db_session)
    service.add_to_wishlist(player["user_id"], player["game_id"], None)

    with pytest.raises(DuplicateFieldError, match="already on your wishlist"):
        service.add_to_wishlist(player["user_id"], player["game_id"], None)


def test_list_for_user_is_sorted_by_title(db_session, player):
    zelda_id = GameRepository(db_session).create("zelda", None, 1986, player["system_id"], "E", player["user_id"]).id
    service = WishlistService(db_session)
    service.add_to_wishlist(player["user_id"], zelda_id, None)
    service.add_to_wishlist(player["user_id"], player["game_id"], None)

    titles = [entry.game.title for entry in service.list_for_user(player["user_id"])]

    assert titles == ["Mario", "zelda"]


def test_mark_purchased_moves_the_game_into_the_library(db_session, player):
    service = WishlistService(db_session)
    entry = service.add_to_wishlist(player["user_id"], player["game_id"], Decimal("20.00"))

    library_entry = service.mark_purchased(entry, "physical", Decimal("18.50"))

    assert library_entry.ownership_type == "physical"
    assert library_entry.price_paid == Decimal("18.50")
    assert WishlistRepository(db_session).get_by_user_and_game(player["user_id"], player["game_id"]) is None
