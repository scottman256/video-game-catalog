import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';

import { Auth } from '../../../core/services/auth';
import { User } from '../../../core/models/user.model';
import { Register } from './register';

const VALID_PAYLOAD = {
  username: 'scott',
  email: 'scott@example.com',
  password: 'Sup3r$3cret',
  confirm_password: 'Sup3r$3cret',
};

describe('Register', () => {
  let registerCalls: unknown[];
  let registerResult: Observable<User>;

  beforeEach(async () => {
    registerCalls = [];
    const authStub = { register: (payload: unknown) => (registerCalls.push(payload), registerResult) };

    await TestBed.configureTestingModule({
      imports: [Register],
      providers: [provideRouter([]), { provide: Auth, useValue: authStub }],
    }).compileComponents();

    const router = TestBed.inject(Router);
    router.navigateByUrl = (() => Promise.resolve(true)) as typeof router.navigateByUrl;
  });

  it('rejects a weak password', () => {
    const fixture = TestBed.createComponent(Register);
    fixture.componentInstance['form'].setValue({ ...VALID_PAYLOAD, password: 'weak', confirm_password: 'weak' });

    fixture.componentInstance.submit();

    expect(registerCalls.length).toBe(0);
  });

  it('rejects mismatched password confirmation', () => {
    const fixture = TestBed.createComponent(Register);
    fixture.componentInstance['form'].setValue({ ...VALID_PAYLOAD, confirm_password: 'Different$1' });

    fixture.componentInstance.submit();

    expect(registerCalls.length).toBe(0);
  });

  it('submits when the form is valid', () => {
    registerResult = of({ id: 1, username: 'scott', email: 'scott@example.com' });
    const fixture = TestBed.createComponent(Register);
    fixture.componentInstance['form'].setValue(VALID_PAYLOAD);

    fixture.componentInstance.submit();

    expect(registerCalls).toEqual([VALID_PAYLOAD]);
  });

  it('surfaces a field-level error from a duplicate username response', () => {
    registerResult = throwError(() => ({ status: 409, error: { detail: { field: 'username', message: 'Username is taken' } } }));
    const fixture = TestBed.createComponent(Register);
    fixture.componentInstance['form'].setValue(VALID_PAYLOAD);

    fixture.componentInstance.submit();

    expect(fixture.componentInstance['fieldErrors']()).toEqual({ username: 'Username is taken' });
    expect(fixture.componentInstance['errorMessage']()).toBeNull();
  });

  it('says the server is unreachable when the API is down', () => {
    registerResult = throwError(() => ({ status: 0 }));
    const fixture = TestBed.createComponent(Register);
    fixture.componentInstance['form'].setValue(VALID_PAYLOAD);

    fixture.componentInstance.submit();

    expect(fixture.componentInstance['errorMessage']()).toContain('Cannot reach the server');
    expect(fixture.componentInstance['submitting']()).toBe(false);
  });
});
