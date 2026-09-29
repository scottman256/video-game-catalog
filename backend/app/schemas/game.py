from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.system import SystemOut

EsrbRating = Literal["EC", "E", "E10+", "T", "M", "AO", "RP"]


class GameImageOut(BaseModel):
    id: int
    kind: str
    url: str
    display_order: int


class GameCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    summary: str | None = None
    release_year: int = Field(ge=1970, le=2100)
    system_id: int
    esrb_rating: EsrbRating


class GameOut(BaseModel):
    id: int
    title: str
    summary: str | None
    release_year: int
    esrb_rating: str
    system: SystemOut
    images: list[GameImageOut]
    community_average_score: float | None
    in_library: bool
    in_wishlist: bool
    is_approved: bool
