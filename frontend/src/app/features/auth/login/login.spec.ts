import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';

import { Auth } from '../../../core/services/auth';
import { User } from '../../../core/models/user.model';
import { buttonWithText, enterValue } from '../../../testing/dom';
import { Login } from './login';

const PLAYER: User = {
  id: 1,
  username: 'scott',
  email: 'a@b.com',
  is_admin: false,
  impersonated_by: null,
};

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

  function render(): ComponentFixture<Login> {
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    return fixture;
  }

  function logInButton(fixture: ComponentFixture<Login>): HTMLButtonElement {
    return buttonWithText(fixture.nativeElement, 'Log in');
  }

  async function logIn(
    fixture: ComponentFixture<Login>,
    identifier: string,
    password: string,
  ): Promise<void> {
    enterValue(fixture.nativeElement.querySelector('#identifier'), identifier);
    enterValue(fixture.nativeElement.querySelector('#password'), password);
    fixture.detectChanges();
    logInButton(fixture).click();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function shownError(fixture: ComponentFixture<Login>): string {
    return fixture.nativeElement.querySelector('app-field-error').textContent;
  }

  it('keeps the button disabled and does not submit while the form is incomplete', () => {
    const fixture = render();

    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));

    expect(logInButton(fixture).disabled).toBe(true);
    expect(loginCalls.length).toBe(0);
  });

  it('logs in with the entered credentials and opens my games', async () => {
    loginResult = of(PLAYER);
    const fixture = render();

    await logIn(fixture, 'scott', 'pw');

    expect(loginCalls).toEqual([{ identifier: 'scott', password: 'pw' }]);
    expect(navigateCalls).toEqual(['/my-games']);
  });

  it('sends an admin to the admin screens on successful login', async () => {
    homeUrl = '/admin/games';
    loginResult = of({
      id: 3,
      username: 'admin',
      email: 'admin@admin.com',
      is_admin: true,
      impersonated_by: null,
    });
    const fixture = render();

    await logIn(fixture, 'admin', 'pw');

    expect(navigateCalls).toEqual(['/admin/games']);
  });

  it('blames the credentials only when the server rejects them', async () => {
    loginResult = throwError(() => ({ status: 401 }));
    const fixture = render();

    await logIn(fixture, 'scott', 'wrong');

    expect(shownError(fixture)).toContain('Invalid');
    expect(logInButton(fixture).disabled).toBe(false);
  });

  it('says the server is unreachable rather than blaming the password when the API is down', async () => {
    loginResult = throwError(() => ({ status: 0 }));
    const fixture = render();

    await logIn(fixture, 'scott', 'Mario64!!');

    expect(shownError(fixture)).toContain('Cannot reach the server');
    expect(shownError(fixture)).not.toContain('Invalid');
  });

  it('reports an unexpected server failure generically', async () => {
    loginResult = throwError(() => ({ status: 500 }));
    const fixture = render();

    await logIn(fixture, 'scott', 'pw');

    expect(shownError(fixture)).toContain('Something went wrong');
  });

  it('re-enables the button after a successful login so it can never lock up', async () => {
    loginResult = of(PLAYER);
    const fixture = render();

    await logIn(fixture, 'scott', 'pw');

    expect(logInButton(fixture).disabled).toBe(false);
  });

  it('explains itself when signing in succeeds but navigation is blocked', async () => {
    loginResult = of(PLAYER);
    const router = TestBed.inject(Router);
    router.navigateByUrl = (() => Promise.resolve(false)) as typeof router.navigateByUrl;
    const fixture = render();

    await logIn(fixture, 'scott', 'pw');

    expect(logInButton(fixture).disabled).toBe(false);
    expect(shownError(fixture)).toContain('could not open your games');
  });
});
