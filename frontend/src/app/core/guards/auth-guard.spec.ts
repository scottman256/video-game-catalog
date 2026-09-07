import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CanActivateFn, provideRouter } from '@angular/router';

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
    TestBed.inject(Auth).currentUser.set({ id: 1, username: 'scott', email: 'scott@example.com' });

    const result = executeGuard({} as never, { url: '/my-games' } as never);

    expect(result).toBe(true);
  });

  it('redirects to /login when no user is logged in', () => {
    const result = executeGuard({} as never, { url: '/my-games' } as never);

    expect(result).not.toBe(true);
  });
});
