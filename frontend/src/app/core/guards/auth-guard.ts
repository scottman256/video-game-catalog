import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { ADMIN_HOME_URL, Auth } from '../services/auth';

/** Guards the regular-user screens; admins have no library, so they go to their own screens instead. */
export const authGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);
  if (!auth.currentUser()) return router.parseUrl('/login');
  return auth.isAdminView() ? router.parseUrl(ADMIN_HOME_URL) : true;
};
