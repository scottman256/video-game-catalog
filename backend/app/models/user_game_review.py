from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, SmallInteger, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

_SCORE_CHECKS = {
    "graphics_performance": "graphics_performance IS NULL OR graphics_performance BETWEEN 0 AND 10",
    "music_sound": "music_sound IS NULL OR music_sound BETWEEN 0 AND 10",
    "controls_playability": "controls_playability IS NULL OR controls_playability BETWEEN 0 AND 10",
    "content_length": "content_length IS NULL OR content_length BETWEEN 0 AND 10",
    "fun_factor": "fun_factor IS NULL OR fun_factor BETWEEN 0 AND 10",
}


class UserGameReview(Base):
    __tablename__ = "user_game_reviews"
    __table_args__ = tuple(
        CheckConstraint(check, name=f"ck_reviews_{field}_range") for field, check in _SCORE_CHECKS.items()
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_library_id: Mapped[int] = mapped_column(ForeignKey("user_game_library.id"), unique=True, nullable=False)
    graphics_performance: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    music_sound: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    controls_playability: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    content_length: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    fun_factor: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
