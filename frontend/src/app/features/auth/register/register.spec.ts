import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';

import { Auth } from '../../../core/services/auth';
import { User } from '../../../core/models/user.model';
import { buttonWithText, enterValue } from '../../../testing/dom';
import { Register } from './register';

const VALID_PAYLOAD = {
  username: 'scott',
  email: 'scott@example.com',
  password: 'Sup3r$3cret',
  confirm_password: 'Sup3r$3cret',
};

type RegisterForm = typeof VALID_PAYLOAD;

describe('Register', () => {
  let registerCalls: unknown[];
  let registerResult: Observable<User>;
  let navigateCalls: string[];

  beforeEach(async () => {
    registerCalls = [];
    navigateCalls = [];
    registerResult = of({
      id: 1,
      username: 'scott',
      email: 'scott@example.com',
      is_admin: false,
      impersonated_by: null,
    });
    const authStub = {
      register: (payload: unknown) => (registerCalls.push(payload), registerResult),
      homeUrl: () => '/my-games',
    };

    await TestBed.configureTestingModule({
      imports: [Register],
      providers: [provideRouter([]), { provide: Auth, useValue: authStub }],
    }).compileComponents();

    const router = TestBed.inject(Router);
    router.navigateByUrl = ((url: string) => (
      navigateCalls.push(url),
      Promise.resolve(true)
    )) as typeof router.navigateByUrl;
  });

  function render(): ComponentFixture<Register> {
    const fixture = TestBed.createComponent(Register);
    fixture.detectChanges();
    return fixture;
  }

  /** Blurs each field as a user tabbing through would, so touched-only validation messages appear. */
  function fillIn(fixture: ComponentFixture<Register>, values: RegisterForm): void {
    for (const [id, value] of Object.entries(values)) {
      const input: HTMLInputElement = fixture.nativeElement.querySelector(`#${id}`);
      enterValue(input, value);
      input.dispatchEvent(new Event('blur'));
    }
    fixture.detectChanges();
  }

  function createAccountButton(fixture: ComponentFixture<Register>): HTMLButtonElement {
    return buttonWithText(fixture.nativeElement, 'Create account');
  }

  async function submit(fixture: ComponentFixture<Register>): Promise<void> {
    createAccountButton(fixture).click();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function text(fixture: ComponentFixture<Register>): string {
    return fixture.nativeElement.textContent;
  }

  it('rejects a weak password and explains the rules', () => {
    const fixture = render();

    fillIn(fixture, { ...VALID_PAYLOAD, password: 'weak', confirm_password: 'weak' });
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));

    expect(text(fixture)).toContain(
      'Needs 8+ characters with a letter, a number, and a special character',
    );
    expect(createAccountButton(fixture).disabled).toBe(true);
    expect(registerCalls.length).toBe(0);
  });

  it('rejects mismatched password confirmation', () => {
    const fixture = render();

    fillIn(fixture, { ...VALID_PAYLOAD, confirm_password: 'Different$1' });

    expect(text(fixture)).toContain('Passwords do not match');
    expect(createAccountButton(fixture).disabled).toBe(true);
  });

  it('shows no validation messages for a valid form', () => {
    const fixture = render();

    fillIn(fixture, VALID_PAYLOAD);

    expect(text(fixture)).not.toContain('Needs 8+ characters');
    expect(text(fixture)).not.toContain('Passwords do not match');
  });

  it('creates the account and opens my games when the form is valid', async () => {
    const fixture = render();
    fillIn(fixture, VALID_PAYLOAD);

    await submit(fixture);

    expect(registerCalls).toEqual([VALID_PAYLOAD]);
    expect(navigateCalls).toEqual(['/my-games']);
    expect(createAccountButton(fixture).disabled).toBe(false);
  });

  it('surfaces a field-level error from a duplicate username response', async () => {
    registerResult = throwError(() => ({
      status: 409,
      error: { detail: { field: 'username', message: 'Username is taken' } },
    }));
    const fixture = render();
    fillIn(fixture, VALID_PAYLOAD);

    await submit(fixture);

    const usernameField = fixture.nativeElement.querySelector('#username').closest('.form-field');
    expect(usernameField.textContent).toContain('Username is taken');
  });

  it('says the server is unreachable when the API is down', async () => {
    registerResult = throwError(() => ({ status: 0 }));
    const fixture = render();
    fillIn(fixture, VALID_PAYLOAD);

    await submit(fixture);

    expect(text(fixture)).toContain('Cannot reach the server');
    expect(createAccountButton(fixture).disabled).toBe(false);
  });

  it('reports any other failure generically', async () => {
    registerResult = throwError(() => ({ status: 500 }));
    const fixture = render();
    fillIn(fixture, VALID_PAYLOAD);

    await submit(fixture);

    expect(text(fixture)).toContain(
      'Something went wrong creating your account. Please try again.',
    );
  });
});
