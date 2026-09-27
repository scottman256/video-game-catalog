import io

from PIL import Image

from app.repositories.system_repository import SystemRepository
from app.repositories.user_repository import UserRepository

PASSWORD = "Sup3r$3cret"


def _register(client, username: str) -> int:
    payload = {
        "username": username,
        "email": f"{username}@example.com",
        "password": PASSWORD,
        "confirm_password": PASSWORD,
    }
    return client.post("/auth/register", json=payload).json()["id"]


def _login(client, username: str) -> None:
    client.post("/auth/logout")
    client.post("/auth/login", json={"identifier": username, "password": PASSWORD})


def _promote_to_admin(db_session, user_id: int) -> None:
    users = UserRepository(db_session)
    users.set_admin(users.get_by_id(user_id), True)
    db_session.commit()


def _create_system(db_session) -> int:
    system_id = SystemRepository(db_session).create("NES", 1985).id
    db_session.commit()
    return system_id


def _submit_game(client, system_id: int, title: str = "Super Mario Bros") -> int:
    payload = {"title": title, "summary": None, "release_year": 1985, "system_id": system_id, "esrb_rating": "E"}
    return client.post("/games", json=payload).json()["id"]


def _png_bytes() -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (4, 4), color="green").save(buffer, format="PNG")
    return buffer.getvalue()


def _upload(client, url: str, kind: str):
    return client.post(url, data={"kind": kind}, files={"file": ("image.png", _png_bytes(), "image/png")})


def _setup_pending_game_and_admin(client, db_session) -> tuple[int, int]:
    """Returns (submitter_id, game_id) with the admin signed in."""
    system_id = _create_system(db_session)
    submitter_id = _register(client, "scott")
    game_id = _submit_game(client, system_id)
    admin_id = _register(client, "admin")
    _promote_to_admin(db_session, admin_id)
    return submitter_id, game_id


def test_submitted_game_is_pending_and_hidden_from_other_users(client, db_session):
    system_id = _create_system(db_session)
    _register(client, "scott")
    game_id = _submit_game(client, system_id)
    assert client.get(f"/games/{game_id}").json()["is_approved"] is False

    _register(client, "other")

    assert client.get(f"/games/{game_id}").status_code == 404
    assert client.get("/games", params={"q": "mario"}).json() == []
    add_response = client.post("/me/library", json={"game_id": game_id, "ownership_type": "digital"})
    assert add_response.status_code == 404


def test_submitter_can_add_their_pending_game_to_their_library(client, db_session):
    system_id = _create_system(db_session)
    _register(client, "scott")
    game_id = _submit_game(client, system_id)

    response = client.post("/me/library", json={"game_id": game_id, "ownership_type": "digital"})

    assert response.status_code == 201
    assert response.json()["game"]["is_approved"] is False


def test_admin_endpoints_reject_regular_users(client, db_session):
    _register(client, "scott")

    assert client.get("/admin/games").status_code == 403
    assert client.get("/admin/users").status_code == 403
    assert client.post("/admin/impersonation", json={"user_id": 1}).status_code == 403


def test_admin_has_no_library(client, db_session):
    admin_id = _register(client, "admin")
    _promote_to_admin(db_session, admin_id)

    assert client.get("/me/library").status_code == 403


def test_admin_sees_pending_game_in_queue_and_filtered_list(client, db_session):
    _, game_id = _setup_pending_game_and_admin(client, db_session)

    queue = client.get("/admin/games/pending").json()
    pending = client.get("/admin/games", params={"status": "pending"}).json()
    approved = client.get("/admin/games", params={"status": "approved"}).json()

    assert [game["id"] for game in queue] == [game_id]
    assert queue[0]["submitted_by"] == "scott"
    assert [game["id"] for game in pending] == [game_id]
    assert approved == []


def test_admin_can_edit_game(client, db_session):
    _, game_id = _setup_pending_game_and_admin(client, db_session)

    response = client.patch(f"/admin/games/{game_id}", json={"title": "Super Mario Bros.", "summary": "Classic"})

    assert response.status_code == 200
    assert response.json()["title"] == "Super Mario Bros."
    assert response.json()["is_approved"] is False


def test_admin_edit_rejects_unknown_system(client, db_session):
    _, game_id = _setup_pending_game_and_admin(client, db_session)

    response = client.patch(f"/admin/games/{game_id}", json={"system_id": 999})

    assert response.status_code == 422


def test_approving_saves_edits_and_makes_game_available_to_everyone(client, db_session):
    _, game_id = _setup_pending_game_and_admin(client, db_session)

    response = client.post(f"/admin/games/{game_id}/approve", json={"title": "Super Mario Bros."})
    _register(client, "other")

    assert response.json()["is_approved"] is True
    assert client.get("/admin/games/pending").status_code == 403
    assert client.get(f"/games/{game_id}").json()["title"] == "Super Mario Bros."


def test_approve_unknown_game_returns_404(client, db_session):
    _setup_pending_game_and_admin(client, db_session)

    assert client.post("/admin/games/999/approve", json={}).status_code == 404


def test_admin_box_art_upload_replaces_existing_and_screenshots_can_be_deleted(client, db_session):
    _, game_id = _setup_pending_game_and_admin(client, db_session)
    _upload(client, f"/admin/games/{game_id}/images", "box_art")
    screenshot_id = _upload(client, f"/admin/games/{game_id}/images", "screenshot").json()["id"]
    _upload(client, f"/admin/games/{game_id}/images", "box_art")

    delete_response = client.delete(f"/admin/games/{game_id}/images/{screenshot_id}")

    images = client.get(f"/admin/games/{game_id}").json()["images"]
    assert delete_response.status_code == 204
    assert [image["kind"] for image in images] == ["box_art"]


def test_deleting_an_unknown_image_returns_404(client, db_session):
    _, game_id = _setup_pending_game_and_admin(client, db_session)

    assert client.delete(f"/admin/games/{game_id}/images/999").status_code == 404


def test_only_submitter_can_upload_images_through_the_public_endpoint(client, db_session):
    system_id = _create_system(db_session)
    _register(client, "scott")
    game_id = _submit_game(client, system_id)
    assert _upload(client, f"/games/{game_id}/images", "box_art").status_code == 201
    _approve_as_new_admin(client, db_session, game_id)

    _register(client, "other")

    assert _upload(client, f"/games/{game_id}/images", "screenshot").status_code == 403


def _approve_as_new_admin(client, db_session, game_id: int) -> None:
    admin_id = _register(client, "admin")
    _promote_to_admin(db_session, admin_id)
    client.post(f"/admin/games/{game_id}/approve", json={})


def test_admin_user_list_excludes_admins(client, db_session):
    _setup_pending_game_and_admin(client, db_session)

    users = client.get("/admin/users").json()

    assert [user["username"] for user in users] == ["scott"]


def _add_to_library_and_rate(client, game_id: int) -> None:
    entry = client.post("/me/library", json={"game_id": game_id, "ownership_type": "digital"}).json()
    client.put(f"/me/library/{entry['id']}/review", json={"fun_factor": 8})


def test_admin_deletes_game_from_catalog_and_every_library(client, db_session):
    system_id = _create_system(db_session)
    _register(client, "scott")
    game_id = _submit_game(client, system_id)
    _add_to_library_and_rate(client, game_id)
    _upload(client, f"/games/{game_id}/images", "box_art")
    _approve_as_new_admin(client, db_session, game_id)
    _register(client, "other")
    _add_to_library_and_rate(client, game_id)
    _login(client, "admin")

    delete_response = client.delete(f"/admin/games/{game_id}")

    assert delete_response.status_code == 204
    assert client.get(f"/admin/games/{game_id}").status_code == 404
    for player in ("scott", "other"):
        _login(client, player)
        assert client.get("/me/library").json() == []
        assert client.get("/games", params={"q": "mario"}).json() == []


def test_deleting_an_unknown_game_returns_404(client, db_session):
    _setup_pending_game_and_admin(client, db_session)

    assert client.delete("/admin/games/999").status_code == 404


def test_regular_users_cannot_delete_games(client, db_session):
    system_id = _create_system(db_session)
    _register(client, "scott")
    game_id = _submit_game(client, system_id)

    assert client.delete(f"/admin/games/{game_id}").status_code == 403
    assert client.get(f"/games/{game_id}").status_code == 200


def test_players_can_remove_a_rated_game_from_their_library(client, db_session):
    system_id = _create_system(db_session)
    _register(client, "scott")
    game_id = _submit_game(client, system_id)
    _add_to_library_and_rate(client, game_id)
    entry_id = client.get("/me/library").json()[0]["id"]

    assert client.delete(f"/me/library/{entry_id}").status_code == 204
    assert client.get("/me/library").json() == []
