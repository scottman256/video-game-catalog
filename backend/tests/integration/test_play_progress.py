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
FULL_PROGRESS = {"completed_on": "2026-09-01", "fully_completed_on": "2026-09-20", "hours_played": "42.5"}


def _register_and_own_a_game(client, db_session) -> int:
    client.post("/auth/register", json=REGISTER_A)
    system_id = SystemRepository(db_session).create("NES", 1985).id
    db_session.commit()
    game_id = client.post(
        "/games",
        json={"title": "Mario", "summary": None, "release_year": 1985, "system_id": system_id, "esrb_rating": "E"},
    ).json()["id"]
    entry = client.post("/me/library", json={"game_id": game_id, "ownership_type": "digital", "price_paid": None})
    return entry.json()["id"]


def test_new_library_entries_have_no_play_progress(client, db_session):
    library_id = _register_and_own_a_game(client, db_session)

    entry = client.get(f"/me/library/{library_id}").json()

    assert (entry["completed_on"], entry["fully_completed_on"], entry["hours_played"]) == (None, None, None)


def test_save_play_progress_and_see_it_in_my_library(client, db_session):
    library_id = _register_and_own_a_game(client, db_session)

    response = client.put(f"/me/library/{library_id}/progress", json=FULL_PROGRESS)
    listed = client.get("/me/library").json()[0]

    assert response.status_code == 200
    assert listed["completed_on"] == "2026-09-01"
    assert listed["fully_completed_on"] == "2026-09-20"
    assert listed["hours_played"] == "42.5"


def test_play_progress_can_be_cleared(client, db_session):
    library_id = _register_and_own_a_game(client, db_session)
    client.put(f"/me/library/{library_id}/progress", json=FULL_PROGRESS)

    response = client.put(f"/me/library/{library_id}/progress", json={})

    assert (response.json()["completed_on"], response.json()["hours_played"]) == (None, None)


def test_100_percent_without_completion_is_rejected(client, db_session):
    library_id = _register_and_own_a_game(client, db_session)

    response = client.put(f"/me/library/{library_id}/progress", json={"fully_completed_on": "2026-09-01"})

    assert response.status_code == 422
    assert response.json()["detail"] == "A game must be completed before it can be 100% completed"


def test_100_percent_before_completion_is_rejected(client, db_session):
    library_id = _register_and_own_a_game(client, db_session)
    payload = {"completed_on": "2026-09-10", "fully_completed_on": "2026-09-09"}

    response = client.put(f"/me/library/{library_id}/progress", json=payload)

    assert response.status_code == 422


def test_negative_hours_are_rejected(client, db_session):
    library_id = _register_and_own_a_game(client, db_session)

    response = client.put(f"/me/library/{library_id}/progress", json={"hours_played": "-1"})

    assert response.status_code == 422


def test_hours_allow_only_one_decimal_place(client, db_session):
    library_id = _register_and_own_a_game(client, db_session)

    response = client.put(f"/me/library/{library_id}/progress", json={"hours_played": "1.25"})

    assert response.status_code == 422


def test_cannot_update_another_users_play_progress(client, db_session):
    library_id = _register_and_own_a_game(client, db_session)
    client.post("/auth/logout")
    client.post("/auth/register", json=REGISTER_B)

    response = client.put(f"/me/library/{library_id}/progress", json=FULL_PROGRESS)

    assert response.status_code == 404


def test_wishlist_entries_carry_no_play_progress(client, db_session):
    library_id = _register_and_own_a_game(client, db_session)
    game_id = client.get(f"/me/library/{library_id}").json()["game"]["id"]
    client.delete(f"/me/library/{library_id}")

    wishlist_entry = client.post("/me/wishlist", json={"game_id": game_id, "target_price": None}).json()

    assert not {"completed_on", "fully_completed_on", "hours_played"} & wishlist_entry.keys()


def test_play_progress_requires_authentication(client):
    assert client.put("/me/library/1/progress", json={}).status_code == 401
