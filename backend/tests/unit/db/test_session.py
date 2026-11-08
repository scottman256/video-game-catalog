from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from sqlalchemy import create_engine

from app.db import session as session_module
from app.db.session import enable_sqlite_foreign_keys, get_db


@pytest.fixture
def fake_session(monkeypatch) -> Mock:
    fake = Mock()
    monkeypatch.setattr(session_module, "SessionLocal", lambda: fake)
    return fake


def test_get_db_commits_and_closes_when_the_request_succeeds(fake_session):
    dependency = get_db()

    assert next(dependency) is fake_session
    with pytest.raises(StopIteration):
        next(dependency)

    fake_session.commit.assert_called_once()
    fake_session.rollback.assert_not_called()
    fake_session.close.assert_called_once()


def test_get_db_rolls_back_and_closes_when_the_request_fails(fake_session):
    dependency = get_db()
    next(dependency)
    failure = ValueError("request failed")

    with pytest.raises(ValueError):
        dependency.throw(failure)

    fake_session.commit.assert_not_called()
    fake_session.rollback.assert_called_once()
    fake_session.close.assert_called_once()


def test_sqlite_connections_enforce_foreign_keys():
    engine = create_engine("sqlite://")
    enable_sqlite_foreign_keys(engine)

    with engine.connect() as connection:
        foreign_keys = connection.exec_driver_sql("PRAGMA foreign_keys").scalar()
    engine.dispose()

    assert foreign_keys == 1


def test_foreign_key_pragma_is_not_registered_for_other_databases(monkeypatch):
    listens_for = Mock()
    monkeypatch.setattr(session_module.event, "listens_for", listens_for)

    enable_sqlite_foreign_keys(SimpleNamespace(dialect=SimpleNamespace(name="postgresql")))

    listens_for.assert_not_called()
