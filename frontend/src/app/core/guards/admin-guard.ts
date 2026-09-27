import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { Auth, USER_HOME_URL } from '../services/auth';

/** Admin screens stay reachable while the admin is acting as another user. */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);
  if (!auth.currentUser()) return router.parseUrl('/login');
  return auth.hasAdminAccess() ? true : router.parseUrl(USER_HOME_URL);
};
