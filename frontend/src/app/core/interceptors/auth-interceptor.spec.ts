import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { authInterceptor } from './auth-interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('sends requests with credentials included', () => {
    http.get(`${environment.apiBaseUrl}/games`).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/games`);
    expect(req.request.withCredentials).toBe(true);
    req.flush([]);
  });

  it('retries once after a successful refresh on a 401', () => {
    http.get(`${environment.apiBaseUrl}/games`).subscribe();

    httpMock.expectOne(`${environment.apiBaseUrl}/games`).flush(null, { status: 401, statusText: 'Unauthorized' });
    httpMock.expectOne(`${environment.apiBaseUrl}/auth/refresh`).flush({ id: 1, username: 'scott', email: 'a@b.com' });
    const retried = httpMock.expectOne(`${environment.apiBaseUrl}/games`);
    retried.flush([]);

    expect(retried.request.withCredentials).toBe(true);
  });

  it('does not attempt refresh for a 401 on an auth endpoint itself', () => {
    http.post(`${environment.apiBaseUrl}/auth/login`, {}).subscribe({ error: () => undefined });

    httpMock.expectOne(`${environment.apiBaseUrl}/auth/login`).flush(null, { status: 401, statusText: 'Unauthorized' });

    httpMock.verify();
  });
});
