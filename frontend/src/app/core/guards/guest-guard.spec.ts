import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CanActivateFn, provideRouter } from '@angular/router';

import { ADMIN, PLAYER } from '../../testing/session-fixtures';
import { Auth } from '../services/auth';
import { guestGuard } from './guest-guard';

describe('guestGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => guestGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
  });

  it('lets a signed-out visitor reach the login screen', () => {
    const result = executeGuard({} as never, { url: '/login' } as never);

    expect(result).toBe(true);
  });

  it('redirects a signed-in user away from the login screen', () => {
    TestBed.inject(Auth).currentUser.set(PLAYER);

    const result = executeGuard({} as never, { url: '/login' } as never);

    expect(String(result)).toBe('/my-games');
  });

  it('redirects a signed-in admin to the admin screens', () => {
    TestBed.inject(Auth).currentUser.set(ADMIN);

    const result = executeGuard({} as never, { url: '/login' } as never);

    expect(String(result)).toBe('/admin/games');
  });
});
