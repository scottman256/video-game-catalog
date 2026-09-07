import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { Auth } from '../services/auth';

/** Keeps an already-signed-in user off the login and register screens. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  return auth.currentUser() ? router.parseUrl('/my-games') : true;
};
