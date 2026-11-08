import pytest

from app.repositories.system_repository import SystemRepository
from scripts import seed_systems as seed_systems_module
from scripts.seed_systems import SYSTEMS, main, seed_systems


def test_seed_systems_creates_every_system(db_session):
    seed_systems(db_session)

    names = {system.name for system in SystemRepository(db_session).list_all_ordered_by_release_year()}
    assert names == {name for name, _ in SYSTEMS}


def test_seed_systems_is_safe_to_run_again(db_session):
    seed_systems(db_session)
    seed_systems(db_session)

    assert len(SystemRepository(db_session).list_all_ordered_by_release_year()) == len(SYSTEMS)


def test_main_commits_the_seeded_systems(db_session, monkeypatch):
    monkeypatch.setattr(seed_systems_module, "SessionLocal", lambda: db_session)

    main()

    assert len(SystemRepository(db_session).list_all_ordered_by_release_year()) == len(SYSTEMS)
