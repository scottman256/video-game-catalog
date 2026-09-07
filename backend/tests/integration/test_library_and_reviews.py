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


def _create_game(client, system_id: int, title: str = "Super Mario Bros.") -> int:
    response = client.post(
        "/games",
        json={"title": title, "summary": None, "release_year": 1985, "system_id": system_id, "esrb_rating": "E"},
    )
    return response.json()["id"]


def test_add_rate_and_view_in_my_library(client, db_session):
    client.post("/auth/register", json=REGISTER_A)
    system_id = SystemRepository(db_session).create("NES", 1985).id
    db_session.commit()
    game_id = _create_game(client, system_id)

    add_response = client.post(
        "/me/library", json={"game_id": game_id, "ownership_type": "digital", "price_paid": "19.99"}
    )
    assert add_response.status_code == 201
    library_id = add_response.json()["id"]
    assert add_response.json()["weighted_score"] is None

    review_response = client.put(f"/me/library/{library_id}/review", json={"fun_factor": 10})
    assert review_response.status_code == 200
    assert review_response.json()["weighted_score"] == 5.0

    list_response = client.get("/me/library")
    assert list_response.status_code == 200
    assert list_response.json()[0]["weighted_score"] == 5.0


def test_duplicate_add_returns_409(client, db_session):
    client.post("/auth/register", json=REGISTER_A)
    system_id = SystemRepository(db_session).create("NES", 1985).id
    db_session.commit()
    game_id = _create_game(client, system_id)
    client.post("/me/library", json={"game_id": game_id, "ownership_type": "digital", "price_paid": None})

    response = client.post("/me/library", json={"game_id": game_id, "ownership_type": "physical", "price_paid": None})

    assert response.status_code == 409


def test_community_average_across_multiple_users(client, db_session):
    client.post("/auth/register", json=REGISTER_A)
    system_id = SystemRepository(db_session).create("NES", 1985).id
    db_session.commit()
    game_id = _create_game(client, system_id)
    alice_entry = client.post(
        "/me/library", json={"game_id": game_id, "ownership_type": "digital", "price_paid": None}
    ).json()
    client.put(f"/me/library/{alice_entry['id']}/review", json={"fun_factor": 10})
    client.post("/auth/logout")

    client.post("/auth/register", json=REGISTER_B)
    bob_entry = client.post(
        "/me/library", json={"game_id": game_id, "ownership_type": "digital", "price_paid": None}
    ).json()
    client.put(f"/me/library/{bob_entry['id']}/review", json={"fun_factor": 0})

    detail_response = client.get(f"/games/{game_id}")

    assert detail_response.json()["community_average_score"] == 2.5


def test_sort_query_param_orders_my_library(client, db_session):
    client.post("/auth/register", json=REGISTER_A)
    system_id = SystemRepository(db_session).create("NES", 1985).id
    db_session.commit()
    game_b = _create_game(client, system_id, "B Game")
    game_a = _create_game(client, system_id, "A Game")
    client.post("/me/library", json={"game_id": game_b, "ownership_type": "digital", "price_paid": None})
    client.post("/me/library", json={"game_id": game_a, "ownership_type": "digital", "price_paid": None})

    response = client.get("/me/library", params={"sort": "title", "direction": "asc"})

    titles = [entry["game"]["title"] for entry in response.json()]
    assert titles == ["A Game", "B Game"]


def test_cannot_access_other_users_library_entry(client, db_session):
    client.post("/auth/register", json=REGISTER_A)
    system_id = SystemRepository(db_session).create("NES", 1985).id
    db_session.commit()
    game_id = _create_game(client, system_id)
    entry = client.post(
        "/me/library", json={"game_id": game_id, "ownership_type": "digital", "price_paid": None}
    ).json()
    client.post("/auth/logout")

    client.post("/auth/register", json=REGISTER_B)
    response = client.get(f"/me/library/{entry['id']}")

    assert response.status_code == 404
