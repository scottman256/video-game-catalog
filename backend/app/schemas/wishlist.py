from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.schemas.library import LibraryGameSummary, OwnershipType

Price = Decimal | None


class WishlistCreateRequest(BaseModel):
    game_id: int
    target_price: Price = Field(default=None, ge=0, max_digits=10, decimal_places=2)


class WishlistUpdateRequest(BaseModel):
    target_price: Price = Field(ge=0, max_digits=10, decimal_places=2)


class WishlistPurchaseRequest(BaseModel):
    ownership_type: OwnershipType
    price_paid: Price = Field(default=None, ge=0, max_digits=10, decimal_places=2)


class WishlistEntryOut(BaseModel):
    id: int
    game: LibraryGameSummary
    target_price: Decimal | None
    added_at: datetime
