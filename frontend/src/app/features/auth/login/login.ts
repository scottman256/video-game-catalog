import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { Auth } from '../../../core/services/auth';
import { FieldError } from '../../../shared/components/field-error/field-error';

/** A status of 0 means the request never reached the API (server down, or CORS). */
export function describeLoginError(status: number | undefined): string {
  if (status === 0) return 'Cannot reach the server. Make sure the backend is running.';
  if (status === 401) return 'Invalid username/email or password';
  return 'Something went wrong signing you in. Please try again.';
}

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, FieldError],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly form = this.formBuilder.nonNullable.group({
    identifier: ['', Validators.required],
    password: ['', Validators.required],
  });
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly submitting = signal(false);

  submit(): void {
    if (this.form.invalid) return;
    this.errorMessage.set(null);
    this.submitting.set(true);
    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => this.goToMyGames(),
      error: (error: { status?: number }) => this.failWith(describeLoginError(error.status)),
    });
  }

  private goToMyGames(): void {
    this.router.navigateByUrl('/my-games').then((navigated) => {
      this.submitting.set(false);
      if (!navigated) this.failWith('Signed in, but could not open your games. Please refresh the page.');
    });
  }

  private failWith(message: string): void {
    this.submitting.set(false);
    this.errorMessage.set(message);
  }
}
