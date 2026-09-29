from app.repositories.system_repository import SystemRepository

REGISTER_A = {
    "username": "alice",
    "email": "alice@example.com",
    "password": "Sup3r$3cret",
    "confirm_password": "Sup3r$3cret",
}
REGISTER_B = {
    "username": "bob",
    "email": "bob@example.com",
    "password": "Sup3r$3cret",
    "confirm_password": "Sup3r$3cret",
}


def _register_and_create_game(client, db_session, title: str = "Super Mario Bros.") -> int:
    client.post("/auth/register", json=REGISTER_A)
    system_id = SystemRepository(db_session).create("NES", 1985).id
    db_session.commit()
    response = client.post(
        "/games",
        json={"title": title, "summary": None, "release_year": 1985, "system_id": system_id, "esrb_rating": "E"},
    )
    return response.json()["id"]


def _add_to_wishlist(client, game_id: int, target_price: str | None = None) -> dict:
    return client.post("/me/wishlist", json={"game_id": game_id, "target_price": target_price}).json()


def test_add_and_list_wishlist(client, db_session):
    game_id = _register_and_create_game(client, db_session)

    add_response = client.post("/me/wishlist", json={"game_id": game_id, "target_price": "24.99"})
    list_response = client.get("/me/wishlist")

    assert add_response.status_code == 201
    assert list_response.status_code == 200
    assert list_response.json()[0]["game"]["title"] == "Super Mario Bros."
    assert list_response.json()[0]["target_price"] == "24.99"


def test_adding_an_owned_game_returns_409(client, db_session):
    game_id = _register_and_create_game(client, db_session)
    client.post("/me/library", json={"game_id": game_id, "ownership_type": "digital", "price_paid": None})

    response = client.post("/me/wishlist", json={"game_id": game_id, "target_price": None})

    assert response.status_code == 409
    assert response.json()["detail"] == "You already own this game"


def test_adding_a_missing_game_returns_404(client, db_session):
    _register_and_create_game(client, db_session)

    response = client.post("/me/wishlist", json={"game_id": 999, "target_price": None})

    assert response.status_code == 404


def test_negative_target_price_is_rejected(client, db_session):
    game_id = _register_and_create_game(client, db_session)

    response = client.post("/me/wishlist", json={"game_id": game_id, "target_price": "-1"})

    assert response.status_code == 422


def test_update_target_price(client, db_session):
    game_id = _register_and_create_game(client, db_session)
    entry = _add_to_wishlist(client, game_id, "30.00")

    response = client.patch(f"/me/wishlist/{entry['id']}", json={"target_price": None})

    assert response.status_code == 200
    assert response.json()["target_price"] is None


def test_remove_from_wishlist(client, db_session):
    game_id = _register_and_create_game(client, db_session)
    entry = _add_to_wishlist(client, game_id)

    response = client.delete(f"/me/wishlist/{entry['id']}")

    assert response.status_code == 204
    assert client.get("/me/wishlist").json() == []


def test_purchase_moves_the_game_into_the_library(client, db_session):
    game_id = _register_and_create_game(client, db_session)
    entry = _add_to_wishlist(client, game_id, "20.00")

    response = client.post(
        f"/me/wishlist/{entry['id']}/purchase", json={"ownership_type": "physical", "price_paid": "20.00"}
    )

    assert response.status_code == 201
    assert response.json()["price_paid"] == "20.00"
    assert client.get("/me/wishlist").json() == []
    assert client.get("/me/library").json()[0]["game"]["id"] == game_id


def test_adding_a_wishlisted_game_to_the_library_removes_it_from_the_wishlist(client, db_session):
    game_id = _register_and_create_game(client, db_session)
    _add_to_wishlist(client, game_id)

    client.post("/me/library", json={"game_id": game_id, "ownership_type": "digital", "price_paid": None})

    assert client.get("/me/wishlist").json() == []


def test_search_marks_wishlisted_games(client, db_session):
    game_id = _register_and_create_game(client, db_session)
    _add_to_wishlist(client, game_id)

    results = client.get("/games", params={"q": "mario"}).json()

    assert results[0]["in_wishlist"] is True
    assert results[0]["in_library"] is False


def test_cannot_touch_another_users_wishlist_entry(client, db_session):
    game_id = _register_and_create_game(client, db_session)
    entry = _add_to_wishlist(client, game_id)
    client.post("/auth/logout")
    client.post("/auth/register", json=REGISTER_B)

    assert client.patch(f"/me/wishlist/{entry['id']}", json={"target_price": "1.00"}).status_code == 404
    assert client.delete(f"/me/wishlist/{entry['id']}").status_code == 404
    purchase = client.post(f"/me/wishlist/{entry['id']}/purchase", json={"ownership_type": "digital"})
    assert purchase.status_code == 404


def test_wishlist_requires_authentication(client):
    assert client.get("/me/wishlist").status_code == 401
