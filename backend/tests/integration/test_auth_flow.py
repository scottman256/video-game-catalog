REGISTER_PAYLOAD = {
    "username": "scott",
    "email": "scott@example.com",
    "password": "Sup3r$3cret",
    "confirm_password": "Sup3r$3cret",
}


def test_register_login_me_refresh_logout_flow(client):
    register_response = client.post("/auth/register", json=REGISTER_PAYLOAD)
    assert register_response.status_code == 201
    assert register_response.json()["username"] == "scott"
    assert "access_token" in client.cookies

    me_response = client.post("/auth/logout")
    assert me_response.status_code == 204

    login_response = client.post(
        "/auth/login", json={"identifier": "scott", "password": "Sup3r$3cret"}
    )
    assert login_response.status_code == 200

    me_response = client.get("/auth/me")
    assert me_response.status_code == 200
    assert me_response.json()["email"] == "scott@example.com"

    refresh_response = client.post("/auth/refresh")
    assert refresh_response.status_code == 200

    logout_response = client.post("/auth/logout")
    assert logout_response.status_code == 204

    me_after_logout = client.get("/auth/me")
    assert me_after_logout.status_code == 401


def test_register_rejects_duplicate_username(client):
    client.post("/auth/register", json=REGISTER_PAYLOAD)

    duplicate = client.post(
        "/auth/register",
        json={**REGISTER_PAYLOAD, "email": "different@example.com"},
    )

    assert duplicate.status_code == 409
    assert duplicate.json()["detail"]["field"] == "username"


def test_login_rejects_wrong_password(client):
    client.post("/auth/register", json=REGISTER_PAYLOAD)

    response = client.post(
        "/auth/login", json={"identifier": "scott", "password": "wrong-password"}
    )

    assert response.status_code == 401


def test_me_requires_authentication(client):
    response = client.get("/auth/me")

    assert response.status_code == 401
