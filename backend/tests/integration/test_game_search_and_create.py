import io

from PIL import Image

from app.repositories.system_repository import SystemRepository

REGISTER_PAYLOAD = {
    "username": "scott",
    "email": "scott@example.com",
    "password": "Sup3r$3cret",
    "confirm_password": "Sup3r$3cret",
}


def _png_bytes() -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (4, 4), color="blue").save(buffer, format="PNG")
    return buffer.getvalue()


def _register_and_create_system(client, db_session) -> int:
    client.post("/auth/register", json=REGISTER_PAYLOAD)
    system = SystemRepository(db_session).create("Nintendo Entertainment System", 1985)
    db_session.commit()
    return system.id


def _create_game(client, system_id: int) -> int:
    response = client.post(
        "/games",
        json={
            "title": "Super Mario Bros.",
            "summary": "A classic platformer",
            "release_year": 1985,
            "system_id": system_id,
            "esrb_rating": "E",
        },
    )
    return response.json()["id"]


def test_create_game_and_upload_box_art(client, db_session):
    system_id = _register_and_create_system(client, db_session)

    game_id = _create_game(client, system_id)
    upload_response = client.post(
        f"/games/{game_id}/images",
        data={"kind": "box_art"},
        files={"file": ("cover.png", _png_bytes(), "image/png")},
    )

    assert upload_response.status_code == 201
    assert upload_response.json()["kind"] == "box_art"

    detail_response = client.get(f"/games/{game_id}")
    assert detail_response.status_code == 200
    assert len(detail_response.json()["images"]) == 1


def test_search_finds_created_game(client, db_session):
    system_id = _register_and_create_system(client, db_session)
    _create_game(client, system_id)

    response = client.get("/games", params={"q": "mario"})

    assert response.status_code == 200
    assert response.json()[0]["title"] == "Super Mario Bros."


def test_search_is_case_insensitive_and_no_match_returns_empty(client, db_session):
    system_id = _register_and_create_system(client, db_session)
    _create_game(client, system_id)

    response = client.get("/games", params={"q": "zelda"})

    assert response.status_code == 200
    assert response.json() == []


def test_create_game_rejects_invalid_esrb_rating(client, db_session):
    system_id = _register_and_create_system(client, db_session)

    response = client.post(
        "/games",
        json={
            "title": "Bad Game",
            "summary": None,
            "release_year": 1985,
            "system_id": system_id,
            "esrb_rating": "NOT_A_RATING",
        },
    )

    assert response.status_code == 422


def test_upload_rejects_non_image_content(client, db_session):
    system_id = _register_and_create_system(client, db_session)
    game_id = _create_game(client, system_id)

    response = client.post(
        f"/games/{game_id}/images",
        data={"kind": "box_art"},
        files={"file": ("cover.txt", b"not an image", "text/plain")},
    )

    assert response.status_code == 422


def test_upload_to_nonexistent_game_returns_404(client, db_session):
    _register_and_create_system(client, db_session)

    response = client.post(
        "/games/999/images",
        data={"kind": "box_art"},
        files={"file": ("cover.png", _png_bytes(), "image/png")},
    )

    assert response.status_code == 404


def test_search_marks_games_not_yet_in_the_library(client, db_session):
    system_id = _register_and_create_system(client, db_session)
    _create_game(client, system_id)

    results = client.get("/games", params={"q": "mario"}).json()

    assert results[0]["in_library"] is False


def test_search_marks_games_already_in_the_library(client, db_session):
    system_id = _register_and_create_system(client, db_session)
    game_id = _create_game(client, system_id)
    client.post("/me/library", json={"game_id": game_id, "ownership_type": "digital", "price_paid": None})

    results = client.get("/games", params={"q": "mario"}).json()

    assert results[0]["in_library"] is True


def test_in_library_is_scoped_to_the_requesting_user(client, db_session):
    system_id = _register_and_create_system(client, db_session)
    game_id = _create_game(client, system_id)
    client.post("/me/library", json={"game_id": game_id, "ownership_type": "digital", "price_paid": None})
    client.post("/auth/logout")
    client.post(
        "/auth/register",
        json={
            "username": "other",
            "email": "other@example.com",
            "password": "Sup3r$3cret",
            "confirm_password": "Sup3r$3cret",
        },
    )

    results = client.get("/games", params={"q": "mario"}).json()

    assert results[0]["in_library"] is False


def test_games_endpoints_require_authentication(client):
    response = client.get("/games")

    assert response.status_code == 401
