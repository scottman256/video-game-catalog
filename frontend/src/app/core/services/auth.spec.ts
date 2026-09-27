import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { ADMIN, ADMIN_ACTING_AS_PLAYER, PLAYER } from '../../testing/session-fixtures';
import { Auth } from './auth';

describe('Auth', () => {
  let service: Auth;
  let httpMock: HttpTestingController;
  const user = PLAYER;
  const impersonationUrl = `${environment.apiBaseUrl}/admin/impersonation`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(Auth);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('sets currentUser on successful login', () => {
    service.login({ identifier: 'scott', password: 'pw' }).subscribe();

    httpMock.expectOne(`${environment.apiBaseUrl}/auth/login`).flush(user);

    expect(service.currentUser()).toEqual(user);
  });

  it('sets currentUser on successful register', () => {
    service.register({ username: 'scott', email: 'scott@example.com', password: 'pw', confirm_password: 'pw' }).subscribe();

    httpMock.expectOne(`${environment.apiBaseUrl}/auth/register`).flush(user);

    expect(service.currentUser()).toEqual(user);
  });

  it('clears currentUser on logout', () => {
    service.currentUser.set(user);

    service.logout().subscribe();
    httpMock.expectOne(`${environment.apiBaseUrl}/auth/logout`).flush(null);

    expect(service.currentUser()).toBeNull();
  });

  it('sets currentUser when fetching the current session', () => {
    service.fetchCurrentUser().subscribe();

    httpMock.expectOne(`${environment.apiBaseUrl}/auth/me`).flush(user);

    expect(service.currentUser()).toEqual(user);
  });

  it('starts impersonation and switches the session to the assumed user', () => {
    service.currentUser.set(ADMIN);

    service.startImpersonation(PLAYER.id).subscribe();
    const request = httpMock.expectOne(impersonationUrl);
    request.flush(ADMIN_ACTING_AS_PLAYER);

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ user_id: PLAYER.id });
    expect(service.currentUser()).toEqual(ADMIN_ACTING_AS_PLAYER);
  });

  it('stops impersonation and returns the session to the admin', () => {
    service.currentUser.set(ADMIN_ACTING_AS_PLAYER);

    service.stopImpersonation().subscribe();
    const request = httpMock.expectOne(impersonationUrl);
    request.flush(ADMIN);

    expect(request.request.method).toBe('DELETE');
    expect(service.currentUser()).toEqual(ADMIN);
  });

  describe('session roles', () => {
    it('gives a regular player no admin access', () => {
      service.currentUser.set(PLAYER);

      expect(service.isAdminView()).toBe(false);
      expect(service.hasAdminAccess()).toBe(false);
      expect(service.homeUrl()).toBe('/my-games');
    });

    it('sends an admin to the admin screens', () => {
      service.currentUser.set(ADMIN);

      expect(service.isAdminView()).toBe(true);
      expect(service.homeUrl()).toBe('/admin/games');
    });

    it('keeps admin access while impersonating but shows the player views', () => {
      service.currentUser.set(ADMIN_ACTING_AS_PLAYER);

      expect(service.isImpersonating()).toBe(true);
      expect(service.isAdminView()).toBe(false);
      expect(service.hasAdminAccess()).toBe(true);
      expect(service.homeUrl()).toBe('/my-games');
    });
  });
});
