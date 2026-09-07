import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { Auth } from './auth';

describe('Auth', () => {
  let service: Auth;
  let httpMock: HttpTestingController;
  const user = { id: 1, username: 'scott', email: 'scott@example.com' };

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
});
