from datetime import datetime

from pydantic import BaseModel


class ProfileOut(BaseModel):
    username: str
    email: str
    created_at: datetime
    profile_picture_url: str | None
    games_owned: int
    systems_owned: int
    average_review_score: float | None
