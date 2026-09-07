import { Component, inject, input, output, signal } from '@angular/core';

import { SettingsService } from '../../../core/services/settings';

@Component({
  selector: 'app-settings-modal',
  imports: [],
  templateUrl: './settings-modal.html',
  styleUrl: './settings-modal.scss',
})
export class SettingsModal {
  private readonly settingsService = inject(SettingsService);

  readonly open = input(false);
  readonly closed = output<void>();

  protected readonly darkMode = this.settingsService.darkMode;
  protected readonly saving = signal(false);

  toggleDarkMode(): void {
    const previousValue = this.darkMode();
    const nextValue = !previousValue;
    this.settingsService.darkMode.set(nextValue);
    this.saving.set(true);
    this.settingsService.update(nextValue).subscribe({
      next: () => this.saving.set(false),
      error: () => {
        this.saving.set(false);
        this.settingsService.darkMode.set(previousValue);
      },
    });
  }
}
