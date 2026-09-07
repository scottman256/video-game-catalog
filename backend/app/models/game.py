from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

ESRB_RATINGS = ("EC", "E", "E10+", "T", "M", "AO", "RP")
_ESRB_CHECK = "esrb_rating IN ('EC', 'E', 'E10+', 'T', 'M', 'AO', 'RP')"


class Game(Base):
    __tablename__ = "games"
    __table_args__ = (CheckConstraint(_ESRB_CHECK, name="ck_games_esrb_rating"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    release_year: Mapped[int] = mapped_column(Integer, nullable=False)
    system_id: Mapped[int] = mapped_column(ForeignKey("systems.id"), nullable=False)
    esrb_rating: Mapped[str] = mapped_column(String(10), nullable=False)
    created_by_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    system: Mapped["System"] = relationship()
    images: Mapped[list["GameImage"]] = relationship(order_by="GameImage.display_order")
