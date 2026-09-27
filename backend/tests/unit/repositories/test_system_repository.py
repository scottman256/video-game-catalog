from app.repositories.system_repository import SystemRepository


def test_list_all_ordered_by_release_year(db_session):
    repo = SystemRepository(db_session)
    repo.create("Nintendo 64", 1996)
    repo.create("Nintendo Entertainment System", 1985)
    repo.create("Super Nintendo Entertainment System", 1991)

    systems = repo.list_all_ordered_by_release_year()

    assert [system.name for system in systems] == [
        "Nintendo Entertainment System",
        "Super Nintendo Entertainment System",
        "Nintendo 64",
    ]


def test_name_exists(db_session):
    repo = SystemRepository(db_session)
    repo.create("Nintendo Entertainment System", 1985)

    assert repo.name_exists("Nintendo Entertainment System") is True
    assert repo.name_exists("Sega Genesis") is False


def test_exists_reports_whether_system_is_present(db_session):
    repo = SystemRepository(db_session)
    system = repo.create("Nintendo Entertainment System", 1985)

    assert repo.exists(system.id) is True
    assert repo.exists(999) is False
