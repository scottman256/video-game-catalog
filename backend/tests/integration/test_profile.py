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
    Image.new("RGB", (4, 4), color="green").save(buffer, format="PNG")
    return buffer.getvalue()


def _create_game(client, system_id: int, title: str) -> int:
    response = client.post(
        "/games",
        json={"title": title, "summary": None, "release_year": 1990, "system_id": system_id, "esrb_rating": "E"},
    )
    return response.json()["id"]


def test_new_profile_reports_empty_stats(client):
    client.post("/auth/register", json=REGISTER_PAYLOAD)

    response = client.get("/me/profile")

    assert response.status_code == 200
    body = response.json()
    assert body["username"] == "scott"
    assert body["games_owned"] == 0
    assert body["systems_owned"] == 0
    assert body["average_review_score"] is None
    assert body["profile_picture_url"] is None
    assert body["created_at"] is not None


def test_profile_reflects_library_and_reviews(client, db_session):
    client.post("/auth/register", json=REGISTER_PAYLOAD)
    nes_id = SystemRepository(db_session).create("NES", 1985).id
    snes_id = SystemRepository(db_session).create("SNES", 1991).id
    db_session.commit()
    first_game = _create_game(client, nes_id, "Mario")
    second_game = _create_game(client, snes_id, "Metroid")
    first_entry = client.post(
        "/me/library", json={"game_id": first_game, "ownership_type": "digital", "price_paid": None}
    ).json()
    client.post("/me/library", json={"game_id": second_game, "ownership_type": "physical", "price_paid": None})
    client.put(f"/me/library/{first_entry['id']}/review", json={"fun_factor": 10})

    body = client.get("/me/profile").json()

    assert body["games_owned"] == 2
    assert body["systems_owned"] == 2
    assert body["average_review_score"] == 5.0


def test_upload_profile_picture_returns_updated_profile(client):
    client.post("/auth/register", json=REGISTER_PAYLOAD)

    response = client.post("/me/profile/picture", files={"file": ("avatar.png", _png_bytes(), "image/png")})

    assert response.status_code == 200
    assert "/uploads/profile_pictures/" in response.json()["profile_picture_url"]


def test_uploaded_picture_persists_on_the_profile(client):
    client.post("/auth/register", json=REGISTER_PAYLOAD)
    client.post("/me/profile/picture", files={"file": ("avatar.png", _png_bytes(), "image/png")})

    body = client.get("/me/profile").json()

    assert body["profile_picture_url"] is not None


def test_upload_profile_picture_rejects_non_image(client):
    client.post("/auth/register", json=REGISTER_PAYLOAD)

    response = client.post("/me/profile/picture", files={"file": ("avatar.txt", b"not an image", "text/plain")})

    assert response.status_code == 422


def test_profile_requires_authentication(client):
    assert client.get("/me/profile").status_code == 401
