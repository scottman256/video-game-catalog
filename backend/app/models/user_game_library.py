from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Numeric, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

_OWNERSHIP_CHECK = "ownership_type IN ('digital', 'physical')"


class UserGameLibrary(Base):
    __tablename__ = "user_game_library"
    __table_args__ = (
        UniqueConstraint("user_id", "game_id", name="uq_user_game_library_user_game"),
        CheckConstraint(_OWNERSHIP_CHECK, name="ck_user_game_library_ownership_type"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    game_id: Mapped[int] = mapped_column(ForeignKey("games.id"), nullable=False, index=True)
    ownership_type: Mapped[str] = mapped_column(String(20), nullable=False)
    price_paid: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    added_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    fully_completed_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    hours_played: Mapped[Decimal | None] = mapped_column(Numeric(7, 1), nullable=True)

    game: Mapped["Game"] = relationship()
    review: Mapped["UserGameReview | None"] = relationship(uselist=False, cascade="all, delete-orphan")
