import { Component, computed, effect, inject, input, output, signal } from '@angular/core';

import { LibraryEntry, PlayProgressPayload } from '../../../core/models/library-entry.model';
import { LibraryService } from '../../../core/services/library';
import { FieldError } from '../../../shared/components/field-error/field-error';
import { todayAsIsoDate } from '../../../shared/utils/local-date';

type HttpError = { error?: { detail?: unknown } };

@Component({
  selector: 'app-play-progress-form',
  imports: [FieldError],
  templateUrl: './play-progress-form.html',
  styleUrl: './play-progress-form.scss',
})
export class PlayProgressForm {
  private readonly libraryService = inject(LibraryService);

  readonly entry = input.required<LibraryEntry>();
  readonly saved = output<LibraryEntry>();

  protected readonly today = todayAsIsoDate();
  protected readonly completedOn = signal('');
  protected readonly fullyCompletedOn = signal('');
  protected readonly hoursPlayed = signal('');
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly savedMessage = signal<string | null>(null);

  protected readonly completed = computed(() => this.completedOn() !== '');
  protected readonly fullyCompleted = computed(() => this.fullyCompletedOn() !== '');
  protected readonly validationError = computed(() => {
    if (!this.fullyCompleted()) return null;
    if (!this.completed()) return 'A game must be completed before it can be 100% completed.';
    return this.fullyCompletedOn() < this.completedOn() ? "The 100% date can't be before the completed date." : null;
  });

  constructor() {
    effect(() => this.loadFrom(this.entry()));
  }

  setCompleted(checked: boolean): void {
    this.completedOn.set(checked ? this.today : '');
    if (!checked) this.fullyCompletedOn.set('');
    this.savedMessage.set(null);
  }

  /** 100% implies completed, so ticking it also ticks Completed when needed. */
  setFullyCompleted(checked: boolean): void {
    if (checked && !this.completed()) this.completedOn.set(this.today);
    this.fullyCompletedOn.set(checked ? this.today : '');
    this.savedMessage.set(null);
  }

  submit(): void {
    this.saving.set(true);
    this.errorMessage.set(null);
    this.libraryService.updatePlayProgress(this.entry().id, this.payload()).subscribe({
      next: (updated) => this.onSaved(updated),
      error: (error: HttpError) => this.onSaveFailed(error),
    });
  }

  private loadFrom(entry: LibraryEntry): void {
    this.completedOn.set(entry.completed_on ?? '');
    this.fullyCompletedOn.set(entry.fully_completed_on ?? '');
    this.hoursPlayed.set(entry.hours_played ?? '');
  }

  private payload(): PlayProgressPayload {
    return {
      completed_on: this.completedOn() || null,
      fully_completed_on: this.fullyCompletedOn() || null,
      hours_played: this.hoursPlayed() || null,
    };
  }

  private onSaved(updated: LibraryEntry): void {
    this.saving.set(false);
    this.savedMessage.set('Progress saved.');
    this.saved.emit(updated);
  }

  /** Field-level validation errors arrive as a list; only a plain message is worth showing as-is. */
  private onSaveFailed(error: HttpError): void {
    const detail = error.error?.detail;
    this.saving.set(false);
    this.errorMessage.set(typeof detail === 'string' ? detail : 'Could not save your progress. Please check the values.');
  }
}
