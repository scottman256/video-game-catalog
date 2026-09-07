REGISTER_PAYLOAD = {
    "username": "scott",
    "email": "scott@example.com",
    "password": "Sup3r$3cret",
    "confirm_password": "Sup3r$3cret",
}


def test_get_settings_defaults_to_light_mode(client):
    client.post("/auth/register", json=REGISTER_PAYLOAD)

    response = client.get("/me/settings")

    assert response.status_code == 200
    assert response.json() == {"dark_mode": False}


def test_update_and_persist_dark_mode(client):
    client.post("/auth/register", json=REGISTER_PAYLOAD)

    update_response = client.put("/me/settings", json={"dark_mode": True})
    assert update_response.status_code == 200
    assert update_response.json() == {"dark_mode": True}

    get_response = client.get("/me/settings")
    assert get_response.json() == {"dark_mode": True}


def test_settings_survive_logout_and_login(client):
    client.post("/auth/register", json=REGISTER_PAYLOAD)
    client.put("/me/settings", json={"dark_mode": True})
    client.post("/auth/logout")

    client.post("/auth/login", json={"identifier": "scott", "password": "Sup3r$3cret"})
    response = client.get("/me/settings")

    assert response.json() == {"dark_mode": True}


def test_settings_require_authentication(client):
    response = client.get("/me/settings")

    assert response.status_code == 401
