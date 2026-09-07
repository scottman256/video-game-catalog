import { GameSystem } from './system.model';

export type OwnershipType = 'digital' | 'physical';
export type LibrarySortField = 'rating' | 'title' | 'release_year' | 'system' | 'added_at';
export type SortDirection = 'asc' | 'desc';

export interface LibraryGameSummary {
  id: number;
  title: string;
  release_year: number;
  system: GameSystem;
  box_art_url: string | null;
}

export interface LibraryEntry {
  id: number;
  game: LibraryGameSummary;
  ownership_type: OwnershipType;
  price_paid: string | null;
  added_at: string;
  weighted_score: number | null;
}

export interface LibraryCreatePayload {
  game_id: number;
  ownership_type: OwnershipType;
  price_paid: string | null;
}
