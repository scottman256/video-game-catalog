import { Component, effect, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AdminService } from './core/services/admin';
import { Auth } from './core/services/auth';
import { ProfileService } from './core/services/profile';
import { SettingsService } from './core/services/settings';
import { ProfileModal } from './features/profile/profile-modal/profile-modal';
import { SettingsModal } from './features/settings/settings-modal/settings-modal';
import { UserAvatar } from './shared/components/user-avatar/user-avatar';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, SettingsModal, ProfileModal, UserAvatar],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly auth = inject(Auth);
  private readonly settingsService = inject(SettingsService);
  private readonly profileService = inject(ProfileService);
  private readonly router = inject(Router);
  private readonly adminService = inject(AdminService);

  protected readonly profile = this.profileService.profile;
  protected readonly pendingCount = this.adminService.pendingCount;
  protected readonly menuOpen = signal(false);
  protected readonly settingsOpen = signal(false);
  protected readonly profileOpen = signal(false);

  constructor() {
    effect(() => (this.auth.currentUser() ? this.loadSession() : this.clearSession()));
    effect(() => {
      if (this.auth.isAdminView()) this.adminService.listPendingGames().subscribe();
    });
  }

  openProfile(): void {
    this.menuOpen.set(false);
    this.profileService.load().subscribe();
    this.profileOpen.set(true);
  }

  openSettings(): void {
    this.menuOpen.set(false);
    this.settingsOpen.set(true);
  }

  stopImpersonation(): void {
    this.auth.stopImpersonation().subscribe(() => this.router.navigateByUrl('/admin/users'));
  }

  logout(): void {
    this.menuOpen.set(false);
    this.auth.logout().subscribe(() => this.router.navigateByUrl('/login'));
  }

  private loadSession(): void {
    this.settingsService.load().subscribe();
    this.profileService.load().subscribe();
  }

  private clearSession(): void {
    this.settingsService.resetToDefaults();
    this.profileService.clear();
  }
}
