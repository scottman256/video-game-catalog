import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CanActivateFn, provideRouter } from '@angular/router';

import { ADMIN, ADMIN_ACTING_AS_PLAYER, PLAYER } from '../../testing/session-fixtures';
import { Auth } from '../services/auth';
import { authGuard } from './auth-guard';

describe('authGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => authGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
  });

  it('allows navigation when a user is logged in', () => {
    TestBed.inject(Auth).currentUser.set(PLAYER);

    const result = executeGuard({} as never, { url: '/my-games' } as never);

    expect(result).toBe(true);
  });

  it('redirects to /login when no user is logged in', () => {
    const result = executeGuard({} as never, { url: '/my-games' } as never);

    expect(String(result)).toBe('/login');
  });

  it('sends an admin to the admin screens because admins have no library', () => {
    TestBed.inject(Auth).currentUser.set(ADMIN);

    const result = executeGuard({} as never, { url: '/my-games' } as never);

    expect(String(result)).toBe('/admin/games');
  });

  it('lets an admin who is acting as a player see the player views', () => {
    TestBed.inject(Auth).currentUser.set(ADMIN_ACTING_AS_PLAYER);

    const result = executeGuard({} as never, { url: '/my-games' } as never);

    expect(result).toBe(true);
  });
});
