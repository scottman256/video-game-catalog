import { GameSystem } from './system.model';

export type ImageKind = 'box_art' | 'screenshot';

export interface GameImage {
  id: number;
  kind: ImageKind;
  url: string;
  display_order: number;
}

export interface Game {
  id: number;
  title: string;
  summary: string | null;
  release_year: number;
  esrb_rating: string;
  system: GameSystem;
  images: GameImage[];
  community_average_score: number | null;
  in_library: boolean;
  in_wishlist: boolean;
  is_approved: boolean;
}

export interface GameCreatePayload {
  title: string;
  summary: string | null;
  release_year: number;
  system_id: number;
  esrb_rating: string;
}

export const ESRB_RATINGS = ['EC', 'E', 'E10+', 'T', 'M', 'AO', 'RP'];
