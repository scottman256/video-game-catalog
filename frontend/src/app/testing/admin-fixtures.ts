import { AdminGame, AdminGameSummary, AdminUser } from '../core/models/admin.model';

const NES = { id: 1, name: 'NES', release_year: 1985 };

export const PENDING_GAME_SUMMARY: AdminGameSummary = {
  id: 10,
  title: 'Super Mario Bros',
  release_year: 1985,
  system: NES,
  box_art_url: null,
  is_approved: false,
  submitted_by: 'scott',
  submitted_at: '2026-09-20T12:00:00Z',
};

export const APPROVED_GAME_SUMMARY: AdminGameSummary = {
  ...PENDING_GAME_SUMMARY,
  id: 11,
  title: 'The Legend of Zelda',
  is_approved: true,
};

export const PENDING_GAME: AdminGame = {
  id: 10,
  title: 'Super Mario Bros',
  summary: 'A classic platformer',
  release_year: 1985,
  esrb_rating: 'E',
  system: NES,
  images: [
    { id: 100, kind: 'box_art', url: 'http://localhost/box.png', display_order: 0 },
    { id: 101, kind: 'screenshot', url: 'http://localhost/shot.png', display_order: 0 },
  ],
  community_average_score: null,
  in_library: false,
  in_wishlist: false,
  is_approved: false,
  submitted_by: 'scott',
  submitted_at: '2026-09-20T12:00:00Z',
};

export const ADMIN_USER_ROW: AdminUser = {
  id: 1,
  username: 'scott',
  email: 'scott@example.com',
  created_at: '2026-09-01T00:00:00Z',
  profile_picture_url: null,
};
