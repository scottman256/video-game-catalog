import { TestBed } from '@angular/core/testing';

import { PasswordStrengthMeter } from './password-strength-meter';

describe('PasswordStrengthMeter', () => {
  it('renders nothing when the password is empty', () => {
    const fixture = TestBed.createComponent(PasswordStrengthMeter);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.strength-meter')).toBeNull();
  });

  it('labels a very weak password', () => {
    const fixture = TestBed.createComponent(PasswordStrengthMeter);
    fixture.componentRef.setInput('password', 'a');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Very weak');
  });

  it('labels a strong password', () => {
    const fixture = TestBed.createComponent(PasswordStrengthMeter);
    fixture.componentRef.setInput('password', 'Tr0ub4dor&3xtra$longer!');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Strong');
  });
});
