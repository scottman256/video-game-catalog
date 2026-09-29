import { LibraryGameSummary, OwnershipType } from './library-entry.model';

export interface WishlistEntry {
  id: number;
  game: LibraryGameSummary;
  target_price: string | null;
  added_at: string;
}

export interface WishlistCreatePayload {
  game_id: number;
  target_price: string | null;
}

export interface WishlistPurchasePayload {
  ownership_type: OwnershipType;
  price_paid: string | null;
}
