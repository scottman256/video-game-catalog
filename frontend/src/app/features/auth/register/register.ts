import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { Auth } from '../../../core/services/auth';
import { FieldError } from '../../../shared/components/field-error/field-error';
import { PasswordStrengthMeter } from '../../../shared/components/password-strength-meter/password-strength-meter';

const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

function passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirmPassword = group.get('confirm_password')?.value;
  return password === confirmPassword ? null : { mismatch: true };
}

interface RegisterErrorResponse {
  status?: number;
  error?: { detail?: { field: string; message: string } };
}

/** A status of 0 means the request never reached the API (server down, or CORS). */
export function describeRegisterError(status: number | undefined): string {
  if (status === 0) return 'Cannot reach the server. Make sure the backend is running.';
  return 'Something went wrong creating your account. Please try again.';
}

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, FieldError, PasswordStrengthMeter],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly form = this.formBuilder.nonNullable.group(
    {
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.pattern(PASSWORD_PATTERN)]],
      confirm_password: ['', Validators.required],
    },
    { validators: passwordsMatchValidator },
  );
  protected readonly passwordValue = toSignal(this.form.controls.password.valueChanges, { initialValue: '' });
  protected readonly fieldErrors = signal<Record<string, string>>({});
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly submitting = signal(false);

  submit(): void {
    if (this.form.invalid) return;
    this.fieldErrors.set({});
    this.errorMessage.set(null);
    this.submitting.set(true);
    this.auth.register(this.form.getRawValue()).subscribe({
      next: () => this.goHome(),
      error: (error: RegisterErrorResponse) => this.handleError(error),
    });
  }

  private goHome(): void {
    this.router.navigateByUrl(this.auth.homeUrl()).then(() => this.submitting.set(false));
  }

  private handleError(error: RegisterErrorResponse): void {
    this.submitting.set(false);
    const detail = error.error?.detail;
    this.fieldErrors.set(detail?.field ? { [detail.field]: detail.message } : {});
    this.errorMessage.set(detail?.field ? null : describeRegisterError(error.status));
  }
}
