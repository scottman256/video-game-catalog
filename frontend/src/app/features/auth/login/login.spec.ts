import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';

import { Auth } from '../../../core/services/auth';
import { User } from '../../../core/models/user.model';
import { Login } from './login';

describe('Login', () => {
  let loginCalls: unknown[];
  let loginResult: Observable<User>;
  let navigateCalls: string[];
  let homeUrl: string;

  beforeEach(async () => {
    loginCalls = [];
    navigateCalls = [];
    homeUrl = '/my-games';
    const authStub = {
      login: (payload: unknown) => (loginCalls.push(payload), loginResult),
      homeUrl: () => homeUrl,
    };

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideRouter([]), { provide: Auth, useValue: authStub }],
    }).compileComponents();

    const router = TestBed.inject(Router);
    router.navigateByUrl = ((url: string) => {
      navigateCalls.push(url);
      return Promise.resolve(true);
    }) as typeof router.navigateByUrl;
  });

  it('does not submit when the form is invalid', () => {
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();

    fixture.componentInstance.submit();

    expect(loginCalls.length).toBe(0);
  });

  it('navigates to my-games on successful login', () => {
    loginResult = of({ id: 1, username: 'scott', email: 'a@b.com', is_admin: false, impersonated_by: null });
    const fixture = TestBed.createComponent(Login);
    fixture.componentInstance['form'].setValue({ identifier: 'scott', password: 'pw' });

    fixture.componentInstance.submit();

    expect(navigateCalls).toEqual(['/my-games']);
  });

  it('sends an admin to the admin screens on successful login', () => {
    homeUrl = '/admin/games';
    loginResult = of({ id: 3, username: 'admin', email: 'admin@admin.com', is_admin: true, impersonated_by: null });
    const fixture = TestBed.createComponent(Login);
    fixture.componentInstance['form'].setValue({ identifier: 'admin', password: 'pw' });

    fixture.componentInstance.submit();

    expect(navigateCalls).toEqual(['/admin/games']);
  });

  it('blames the credentials only when the server rejects them', () => {
    loginResult = throwError(() => ({ status: 401 }));
    const fixture = TestBed.createComponent(Login);
    fixture.componentInstance['form'].setValue({ identifier: 'scott', password: 'wrong' });

    fixture.componentInstance.submit();

    expect(fixture.componentInstance['errorMessage']()).toContain('Invalid');
    expect(fixture.componentInstance['submitting']()).toBe(false);
  });

  it('says the server is unreachable rather than blaming the password when the API is down', () => {
    loginResult = throwError(() => ({ status: 0 }));
    const fixture = TestBed.createComponent(Login);
    fixture.componentInstance['form'].setValue({ identifier: 'scott', password: 'Mario64!!' });

    fixture.componentInstance.submit();

    expect(fixture.componentInstance['errorMessage']()).toContain('Cannot reach the server');
    expect(fixture.componentInstance['errorMessage']()).not.toContain('Invalid');
  });

  it('reports an unexpected server failure generically', () => {
    loginResult = throwError(() => ({ status: 500 }));
    const fixture = TestBed.createComponent(Login);
    fixture.componentInstance['form'].setValue({ identifier: 'scott', password: 'pw' });

    fixture.componentInstance.submit();

    expect(fixture.componentInstance['errorMessage']()).toContain('Something went wrong');
  });

  it('re-enables the button after a successful login so it can never lock up', async () => {
    loginResult = of({ id: 1, username: 'scott', email: 'a@b.com', is_admin: false, impersonated_by: null });
    const fixture = TestBed.createComponent(Login);
    fixture.componentInstance['form'].setValue({ identifier: 'scott', password: 'pw' });

    fixture.componentInstance.submit();
    await Promise.resolve();

    expect(fixture.componentInstance['submitting']()).toBe(false);
  });

  it('explains itself when signing in succeeds but navigation is blocked', async () => {
    loginResult = of({ id: 1, username: 'scott', email: 'a@b.com', is_admin: false, impersonated_by: null });
    const router = TestBed.inject(Router);
    router.navigateByUrl = (() => Promise.resolve(false)) as typeof router.navigateByUrl;
    const fixture = TestBed.createComponent(Login);
    fixture.componentInstance['form'].setValue({ identifier: 'scott', password: 'pw' });

    fixture.componentInstance.submit();
    await Promise.resolve();

    expect(fixture.componentInstance['submitting']()).toBe(false);
    expect(fixture.componentInstance['errorMessage']()).toContain('could not open your games');
  });
});
