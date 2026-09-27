from app.core.security import create_impersonation_token
from app.repositories.game_repository import GameRepository
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


def _register_admin(client, db_session) -> int:
    admin_id = _register(client, "admin")
    users = UserRepository(db_session)
    users.set_admin(users.get_by_id(admin_id), True)
    db_session.commit()
    return admin_id


def _create_approved_game(db_session, created_by_user_id: int) -> int:
    system_id = SystemRepository(db_session).create("NES", 1985).id
    game_id = GameRepository(db_session).create("Mario", None, 1985, system_id, "E", created_by_user_id).id
    db_session.commit()
    return game_id


def test_admin_acts_as_user_and_changes_their_library(client, db_session):
    scott_id = _register(client, "scott")
    game_id = _create_approved_game(db_session, scott_id)
    _register_admin(client, db_session)

    start_response = client.post("/admin/impersonation", json={"user_id": scott_id})
    client.post("/me/library", json={"game_id": game_id, "ownership_type": "physical"})

    assert start_response.json()["username"] == "scott"
    assert start_response.json()["impersonated_by"]["username"] == "admin"
    assert client.get("/auth/me").json()["impersonated_by"]["username"] == "admin"
    assert [entry["game"]["id"] for entry in client.get("/me/library").json()] == [game_id]


def test_admin_screens_stay_available_while_impersonating(client, db_session):
    scott_id = _register(client, "scott")
    _register_admin(client, db_session)
    client.post("/admin/impersonation", json={"user_id": scott_id})

    assert client.get("/admin/games").status_code == 200


def test_stop_impersonation_returns_to_admin_session(client, db_session):
    scott_id = _register(client, "scott")
    _register_admin(client, db_session)
    client.post("/admin/impersonation", json={"user_id": scott_id})

    stop_response = client.delete("/admin/impersonation")

    me = client.get("/auth/me").json()
    assert stop_response.json()["username"] == "admin"
    assert me["username"] == "admin"
    assert me["impersonated_by"] is None
    assert client.get("/me/library").status_code == 403


def test_refresh_keeps_impersonation(client, db_session):
    scott_id = _register(client, "scott")
    _register_admin(client, db_session)
    client.post("/admin/impersonation", json={"user_id": scott_id})

    refresh_response = client.post("/auth/refresh")

    assert refresh_response.json()["username"] == "scott"
    assert refresh_response.json()["impersonated_by"]["username"] == "admin"


def test_logging_in_again_ends_impersonation(client, db_session):
    scott_id = _register(client, "scott")
    _register_admin(client, db_session)
    client.post("/admin/impersonation", json={"user_id": scott_id})

    client.post("/auth/login", json={"identifier": "admin", "password": PASSWORD})

    assert client.get("/auth/me").json()["impersonated_by"] is None


def test_cannot_impersonate_another_admin(client, db_session):
    admin_id = _register_admin(client, db_session)

    response = client.post("/admin/impersonation", json={"user_id": admin_id})

    assert response.status_code == 400


def test_regular_user_with_forged_impersonation_cookie_stays_themselves(client, db_session):
    scott_id = _register(client, "scott")
    other_id = _register(client, "other")
    client.cookies.set("impersonation_token", create_impersonation_token(other_id, scott_id))

    me = client.get("/auth/me").json()

    assert me["username"] == "other"
    assert me["impersonated_by"] is None


def test_impersonation_token_is_not_accepted_as_access_token(client, db_session):
    scott_id = _register(client, "scott")
    admin_id = _register_admin(client, db_session)
    client.post("/auth/logout")
    client.cookies.set("access_token", create_impersonation_token(admin_id, scott_id))

    assert client.get("/auth/me").status_code == 401
