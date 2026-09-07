from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.system import SystemOut
from app.services.system_service import SystemService

router = APIRouter(prefix="/systems", tags=["systems"])


@router.get("", response_model=list[SystemOut])
def list_systems(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[SystemOut]:
    return SystemService(db).list_systems()
