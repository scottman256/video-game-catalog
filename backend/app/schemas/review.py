from pydantic import BaseModel, Field


class ReviewUpsertRequest(BaseModel):
    graphics_performance: int | None = Field(default=None, ge=0, le=10)
    music_sound: int | None = Field(default=None, ge=0, le=10)
    controls_playability: int | None = Field(default=None, ge=0, le=10)
    content_length: int | None = Field(default=None, ge=0, le=10)
    fun_factor: int | None = Field(default=None, ge=0, le=10)


class ReviewOut(BaseModel):
    graphics_performance: int | None
    music_sound: int | None
    controls_playability: int | None
    content_length: int | None
    fun_factor: int | None
    weighted_score: float | None
