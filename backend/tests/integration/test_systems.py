from app.repositories.system_repository import SystemRepository

REGISTER_PAYLOAD = {
    "username": "scott",
    "email": "scott@example.com",
    "password": "Sup3r$3cret",
    "confirm_password": "Sup3r$3cret",
}


def test_list_systems_returns_systems_ordered_by_release_year(client, db_session):
    client.post("/auth/register", json=REGISTER_PAYLOAD)
    SystemRepository(db_session).create("Nintendo 64", 1996)
    SystemRepository(db_session).create("Nintendo Entertainment System", 1985)
    db_session.commit()

    response = client.get("/systems")

    assert response.status_code == 200
    names = [system["name"] for system in response.json()]
    assert names == ["Nintendo Entertainment System", "Nintendo 64"]
