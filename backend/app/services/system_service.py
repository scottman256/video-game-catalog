from sqlalchemy.orm import Session

from app.models.system import System
from app.repositories.system_repository import SystemRepository


class SystemService:
    def __init__(self, db: Session) -> None:
        self._systems = SystemRepository(db)

    def list_systems(self) -> list[System]:
        return self._systems.list_all_ordered_by_release_year()
