import { Component, ElementRef, afterRenderEffect, inject, input, output, signal, viewChild } from '@angular/core';

import { AdminGameSummary } from '../../../core/models/admin.model';
import { AdminService } from '../../../core/services/admin';

export type DeletableGame = Pick<AdminGameSummary, 'id' | 'title' | 'is_approved'>;

@Component({
  selector: 'app-delete-game-dialog',
  templateUrl: './delete-game-dialog.html',
  styleUrl: './delete-game-dialog.scss',
})
export class DeleteGameDialog {
  private readonly adminService = inject(AdminService);
  private readonly cancelButton = viewChild<ElementRef<HTMLButtonElement>>('cancelButton');

  /** The dialog is open while a game is set. */
  readonly game = input<DeletableGame | null>(null);
  readonly deleted = output<DeletableGame>();
  readonly cancelled = output<void>();

  protected readonly deleting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  constructor() {
    // Start on Cancel so a stray Enter can never delete a game.
    afterRenderEffect(() => this.cancelButton()?.nativeElement.focus());
  }

  confirm(game: DeletableGame): void {
    this.deleting.set(true);
    this.errorMessage.set(null);
    this.adminService.deleteGame(game).subscribe({
      next: () => this.finish(() => this.deleted.emit(game)),
      error: () => this.finish(() => this.errorMessage.set(`Could not delete "${game.title}". Please try again.`)),
    });
  }

  cancel(): void {
    if (this.deleting()) return;
    this.errorMessage.set(null);
    this.cancelled.emit();
  }

  private finish(then: () => void): void {
    this.deleting.set(false);
    then();
  }
}
