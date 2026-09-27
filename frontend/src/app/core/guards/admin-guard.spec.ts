import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CanActivateFn, provideRouter } from '@angular/router';

import { ADMIN, ADMIN_ACTING_AS_PLAYER, PLAYER } from '../../testing/session-fixtures';
import { Auth } from '../services/auth';
import { adminGuard } from './admin-guard';

describe('adminGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => adminGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
  });

  it('lets an admin reach the admin screens', () => {
    TestBed.inject(Auth).currentUser.set(ADMIN);

    expect(executeGuard({} as never, { url: '/admin/games' } as never)).toBe(true);
  });

  it('keeps the admin screens reachable while acting as a player', () => {
    TestBed.inject(Auth).currentUser.set(ADMIN_ACTING_AS_PLAYER);

    expect(executeGuard({} as never, { url: '/admin/games' } as never)).toBe(true);
  });

  it('sends a regular player back to their games', () => {
    TestBed.inject(Auth).currentUser.set(PLAYER);

    expect(String(executeGuard({} as never, { url: '/admin/games' } as never))).toBe('/my-games');
  });

  it('sends a signed-out visitor to the login screen', () => {
    expect(String(executeGuard({} as never, { url: '/admin/games' } as never))).toBe('/login');
  });
});
