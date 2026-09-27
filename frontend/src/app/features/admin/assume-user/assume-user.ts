import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AdminUser } from '../../../core/models/admin.model';
import { AdminService } from '../../../core/services/admin';
import { Auth, USER_HOME_URL } from '../../../core/services/auth';
import { FieldError } from '../../../shared/components/field-error/field-error';
import { UserAvatar } from '../../../shared/components/user-avatar/user-avatar';

@Component({
  selector: 'app-assume-user',
  imports: [DatePipe, FieldError, UserAvatar],
  templateUrl: './assume-user.html',
  styleUrl: './assume-user.scss',
})
export class AssumeUser {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  protected readonly users = signal<AdminUser[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly actingAsUserId = computed(() => (this.auth.isImpersonating() ? this.auth.currentUser()?.id : null));

  constructor() {
    inject(AdminService)
      .listUsers()
      .subscribe({
        next: (users) => this.showUsers(users),
        error: () => this.failWith('Could not load users. Please try again.'),
      });
  }

  assume(user: AdminUser): void {
    this.errorMessage.set(null);
    this.auth.startImpersonation(user.id).subscribe({
      next: () => this.router.navigateByUrl(USER_HOME_URL),
      error: () => this.errorMessage.set(`Could not act as ${user.username}. Please try again.`),
    });
  }

  private showUsers(users: AdminUser[]): void {
    this.users.set(users);
    this.loading.set(false);
  }

  private failWith(message: string): void {
    this.loading.set(false);
    this.errorMessage.set(message);
  }
}
