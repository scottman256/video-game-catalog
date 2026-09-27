import { Game } from './game.model';
import { GameSystem } from './system.model';

export type ApprovalStatus = 'all' | 'pending' | 'approved';

export interface AdminGameSummary {
  id: number;
  title: string;
  release_year: number;
  system: GameSystem;
  box_art_url: string | null;
  is_approved: boolean;
  submitted_by: string;
  submitted_at: string;
}

export interface AdminGame extends Game {
  submitted_by: string;
  submitted_at: string;
}

export interface GameUpdatePayload {
  title: string;
  summary: string | null;
  release_year: number;
  system_id: number;
  esrb_rating: string;
}

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  created_at: string;
  profile_picture_url: string | null;
}
