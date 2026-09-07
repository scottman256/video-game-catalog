import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CanActivateFn, provideRouter } from '@angular/router';

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
    TestBed.inject(Auth).currentUser.set({ id: 1, username: 'scott', email: 'scott@example.com' });

    const result = executeGuard({} as never, { url: '/login' } as never);

    expect(result).not.toBe(true);
    expect(String(result)).toContain('/my-games');
  });
});
