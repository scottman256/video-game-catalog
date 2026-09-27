from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.system import System


class SystemRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def list_all_ordered_by_release_year(self) -> list[System]:
        stmt = select(System).order_by(System.release_year, System.name)
        return list(self._db.scalars(stmt))

    def create(self, name: str, release_year: int) -> System:
        system = System(name=name, release_year=release_year)
        self._db.add(system)
        self._db.flush()
        return system

    def exists(self, system_id: int) -> bool:
        return self._db.get(System, system_id) is not None

    def name_exists(self, name: str) -> bool:
        return self._db.scalar(select(System.id).where(System.name == name)) is not None
