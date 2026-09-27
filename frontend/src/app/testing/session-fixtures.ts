import { User } from '../core/models/user.model';

export const PLAYER: User = {
  id: 1,
  username: 'scott',
  email: 'scott@example.com',
  is_admin: false,
  impersonated_by: null,
};

export const ADMIN: User = {
  id: 3,
  username: 'admin',
  email: 'admin@admin.com',
  is_admin: true,
  impersonated_by: null,
};

/** The session while the admin acts as PLAYER. */
export const ADMIN_ACTING_AS_PLAYER: User = { ...PLAYER, impersonated_by: { id: ADMIN.id, username: ADMIN.username } };
