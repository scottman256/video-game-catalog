import { Component, effect, inject, input, output, signal } from '@angular/core';

import { LibraryEntry, OwnershipType } from '../../../core/models/library-entry.model';
import { LibraryService } from '../../../core/services/library';
import { FieldError } from '../../../shared/components/field-error/field-error';

@Component({
  selector: 'app-ownership-form',
  imports: [FieldError],
  templateUrl: './ownership-form.html',
  styleUrl: './ownership-form.scss',
})
export class OwnershipForm {
  private readonly libraryService = inject(LibraryService);

  readonly entry = input.required<LibraryEntry>();
  readonly saved = output<LibraryEntry>();

  protected readonly ownershipType = signal<OwnershipType>('digital');
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly savedMessage = signal<string | null>(null);

  constructor() {
    effect(() => this.ownershipType.set(this.entry().ownership_type));
  }

  choose(ownershipType: OwnershipType): void {
    this.ownershipType.set(ownershipType);
    this.savedMessage.set(null);
  }

  submit(): void {
    this.saving.set(true);
    this.errorMessage.set(null);
    this.libraryService.update(this.entry().id, this.ownershipType(), this.entry().price_paid).subscribe({
      next: (updated) => this.onSaved(updated),
      error: () => {
        this.saving.set(false);
        this.errorMessage.set('Could not update your copy. Please try again.');
      },
    });
  }

  private onSaved(updated: LibraryEntry): void {
    this.saving.set(false);
    this.savedMessage.set(`Saved as ${updated.ownership_type}.`);
    this.saved.emit(updated);
  }
}
