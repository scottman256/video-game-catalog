from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.game import EsrbRating, GameOut
from app.schemas.system import SystemOut


class GameUpdateRequest(BaseModel):
    """Every field is optional; only the fields sent are changed."""

    title: str | None = Field(default=None, min_length=1, max_length=200)
    summary: str | None = None
    release_year: int | None = Field(default=None, ge=1970, le=2100)
    system_id: int | None = None
    esrb_rating: EsrbRating | None = None


class AdminGameSummaryOut(BaseModel):
    id: int
    title: str
    release_year: int
    system: SystemOut
    box_art_url: str | None
    is_approved: bool
    submitted_by: str
    submitted_at: datetime


class AdminGameOut(GameOut):
    submitted_by: str
    submitted_at: datetime


class AdminUserOut(BaseModel):
    id: int
    username: str
    email: str
    created_at: datetime
    profile_picture_url: str | None


class ImpersonationRequest(BaseModel):
    user_id: int
