from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.system import SystemOut

OwnershipType = Literal["digital", "physical"]
SortField = Literal["rating", "title", "release_year", "system", "added_at"]
SortDirection = Literal["asc", "desc"]


class LibraryCreateRequest(BaseModel):
    game_id: int
    ownership_type: OwnershipType
    price_paid: Decimal | None = Field(default=None, ge=0, max_digits=10, decimal_places=2)


class LibraryUpdateRequest(BaseModel):
    ownership_type: OwnershipType | None = None
    price_paid: Decimal | None = Field(default=None, ge=0, max_digits=10, decimal_places=2)


class PlayProgressRequest(BaseModel):
    completed_on: date | None = None
    fully_completed_on: date | None = None
    hours_played: Decimal | None = Field(default=None, ge=0, max_digits=7, decimal_places=1)


class LibraryGameSummary(BaseModel):
    id: int
    title: str
    release_year: int
    system: SystemOut
    box_art_url: str | None
    is_approved: bool


class LibraryEntryOut(BaseModel):
    id: int
    game: LibraryGameSummary
    ownership_type: str
    price_paid: Decimal | None
    added_at: datetime
    weighted_score: float | None
    completed_on: date | None
    fully_completed_on: date | None
    hours_played: Decimal | None
