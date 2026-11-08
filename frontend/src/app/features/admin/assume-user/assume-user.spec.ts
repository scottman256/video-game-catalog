import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { NEVER, Observable, of, throwError } from 'rxjs';

import { AdminUser } from '../../../core/models/admin.model';
import { User } from '../../../core/models/user.model';
import { AdminService } from '../../../core/services/admin';
import { Auth } from '../../../core/services/auth';
import { ADMIN_USER_ROW } from '../../../testing/admin-fixtures';
import { ADMIN, ADMIN_ACTING_AS_PLAYER } from '../../../testing/session-fixtures';
import { AssumeUser } from './assume-user';

describe('AssumeUser', () => {
  let impersonationCalls: number[];
  let impersonationResult: Observable<User>;
  let navigated: string[];
  let auth: Auth;
  let usersResult: Observable<AdminUser[]>;

  beforeEach(() => {
    impersonationCalls = [];
    navigated = [];
    impersonationResult = of(ADMIN_ACTING_AS_PLAYER);
    usersResult = of([ADMIN_USER_ROW]);
    TestBed.configureTestingModule({
      imports: [AssumeUser],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AdminService, useValue: { listUsers: () => usersResult } },
      ],
    });
    auth = TestBed.inject(Auth);
    auth.currentUser.set(ADMIN);
    auth.startImpersonation = (userId: number) => (impersonationCalls.push(userId), impersonationResult);
    const router = TestBed.inject(Router);
    router.navigateByUrl = ((url: string) => (navigated.push(url), Promise.resolve(true))) as typeof router.navigateByUrl;
  });

  function render() {
    const fixture = TestBed.createComponent(AssumeUser);
    fixture.detectChanges();
    return fixture;
  }

  it('lists the players an admin can act as', () => {
    expect(render().nativeElement.textContent).toContain('scott@example.com');
  });

  it('acts as the chosen player and opens their games', () => {
    const fixture = render();

    fixture.nativeElement.querySelector('.assume-user__row button').click();

    expect(impersonationCalls).toEqual([ADMIN_USER_ROW.id]);
    expect(navigated).toEqual(['/my-games']);
  });

  it('marks the player already being acted as instead of offering the button', () => {
    auth.currentUser.set(ADMIN_ACTING_AS_PLAYER);

    const fixture = render();

    expect(fixture.nativeElement.querySelector('.assume-user__row button')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Currently acting as');
  });

  it('explains when acting as a player fails', () => {
    impersonationResult = throwError(() => new Error('nope'));
    const fixture = render();

    fixture.nativeElement.querySelector('.assume-user__row button').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Could not act as scott.');
    expect(navigated).toEqual([]);
  });

  it('shows a loading message until the players arrive', () => {
    usersResult = NEVER;

    expect(render().nativeElement.textContent).toContain('Loading…');
  });

  it('says so when there are no player accounts yet', () => {
    usersResult = of([]);

    expect(render().nativeElement.textContent).toContain('There are no player accounts yet.');
  });

  it('shows an error instead of an empty list when the players cannot load', () => {
    usersResult = throwError(() => new Error('down'));

    const text = render().nativeElement.textContent;

    expect(text).toContain('Could not load users. Please try again.');
    expect(text).not.toContain('There are no player accounts yet.');
  });
});
