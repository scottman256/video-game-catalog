import { DatePipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, forkJoin, switchMap } from 'rxjs';

import { AdminGame, GameUpdatePayload } from '../../../core/models/admin.model';
import { ESRB_RATINGS, GameImage, ImageKind } from '../../../core/models/game.model';
import { AdminService } from '../../../core/services/admin';
import { SystemService } from '../../../core/services/system';
import { FieldError } from '../../../shared/components/field-error/field-error';
import { PendingBadge } from '../../../shared/components/pending-badge/pending-badge';
import { DELETED_GAME_TITLE } from '../admin-games/admin-games';
import { DeleteGameDialog, DeletableGame } from '../delete-game-dialog/delete-game-dialog';

export const SAVED_CONFIRMATION_MS = 4000;

interface ApiError {
  error?: { detail?: unknown };
}

export function describeAdminError(error: ApiError): string {
  const detail = error.error?.detail;
  return typeof detail === 'string' ? detail : 'Something went wrong. Please check the form and try again.';
}

function takeSelectedFiles(event: Event): File[] {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  input.value = '';
  return files;
}

@Component({
  selector: 'app-admin-game-editor',
  imports: [DatePipe, ReactiveFormsModule, RouterLink, FieldError, PendingBadge, DeleteGameDialog],
  templateUrl: './admin-game-editor.html',
  styleUrl: './admin-game-editor.scss',
})
export class AdminGameEditor {
  private readonly router = inject(Router);
  private readonly adminService = inject(AdminService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly gameId = Number(inject(ActivatedRoute).snapshot.paramMap.get('id'));
  private hideSavedConfirmationTimer?: ReturnType<typeof setTimeout>;

  protected readonly esrbRatings = ESRB_RATINGS;
  protected readonly systems = toSignal(inject(SystemService).list(), { initialValue: [] });
  protected readonly game = signal<AdminGame | null>(null);
  protected readonly loadError = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly savedConfirmationVisible = signal(false);
  protected readonly deleteDialogOpen = signal(false);
  protected readonly boxArt = computed(() => this.game()?.images.find((image) => image.kind === 'box_art') ?? null);
  protected readonly screenshots = computed(
    () => this.game()?.images.filter((image) => image.kind === 'screenshot') ?? [],
  );

  protected readonly form = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    summary: [''],
    release_year: [2000, [Validators.required, Validators.min(1970), Validators.max(2100)]],
    system_id: [0, [Validators.required, Validators.min(1)]],
    esrb_rating: ['E', Validators.required],
  });

  constructor() {
    this.adminService.getGame(this.gameId).subscribe({
      next: (game) => this.showGame(game),
      error: () => this.loadError.set('Could not load this game. Please go back and try again.'),
    });
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.hideSavedConfirmation());
    inject(DestroyRef).onDestroy(() => clearTimeout(this.hideSavedConfirmationTimer));
  }

  save(): void {
    this.runAction(this.adminService.updateGame(this.gameId, this.changes()), (game) => {
      this.showGame(game);
      this.showSavedConfirmation();
    });
  }

  /** Saves whatever is in the form and approves in one step, so no edit is lost. */
  approve(): void {
    this.runAction(this.adminService.approveGame(this.gameId, this.changes()), () =>
      this.router.navigateByUrl('/admin/queue'),
    );
  }

  onGameDeleted(game: DeletableGame): void {
    this.router.navigateByUrl('/admin/games', { state: { [DELETED_GAME_TITLE]: game.title } });
  }

  onBoxArtSelected(event: Event): void {
    this.uploadImages('box_art', takeSelectedFiles(event).slice(0, 1));
  }

  onScreenshotsSelected(event: Event): void {
    this.uploadImages('screenshot', takeSelectedFiles(event));
  }

  deleteImage(image: GameImage): void {
    if (!window.confirm('Delete this image for everyone? This cannot be undone.')) return;
    this.refreshImagesAfter(this.adminService.deleteImage(this.gameId, image.id));
  }

  private uploadImages(kind: ImageKind, files: File[]): void {
    if (files.length === 0) return;
    this.refreshImagesAfter(forkJoin(files.map((file) => this.adminService.uploadImage(this.gameId, kind, file))));
  }

  /** Only the images are refreshed, so unsaved edits in the form are kept. */
  private refreshImagesAfter(change: Observable<unknown>): void {
    const reloaded = change.pipe(switchMap(() => this.adminService.getGame(this.gameId)));
    this.runAction(reloaded, (game) => this.game.set(game));
  }

  private runAction<T>(action: Observable<T>, onSuccess: (result: T) => void): void {
    this.busy.set(true);
    this.errorMessage.set(null);
    this.hideSavedConfirmation();
    action.subscribe({
      next: (result) => {
        this.busy.set(false);
        onSuccess(result);
      },
      error: (error: ApiError) => {
        this.busy.set(false);
        this.errorMessage.set(describeAdminError(error));
      },
    });
  }

  /** Disappears on its own, or as soon as the form is edited again, so it never vouches for unsaved changes. */
  private showSavedConfirmation(): void {
    this.savedConfirmationVisible.set(true);
    this.hideSavedConfirmationTimer = setTimeout(() => this.hideSavedConfirmation(), SAVED_CONFIRMATION_MS);
  }

  private hideSavedConfirmation(): void {
    clearTimeout(this.hideSavedConfirmationTimer);
    this.savedConfirmationVisible.set(false);
  }

  private showGame(game: AdminGame): void {
    this.game.set(game);
    this.form.setValue({
      title: game.title,
      summary: game.summary ?? '',
      release_year: game.release_year,
      system_id: game.system.id,
      esrb_rating: game.esrb_rating,
    });
  }

  private changes(): GameUpdatePayload {
    const values = this.form.getRawValue();
    return { ...values, summary: values.summary.trim() || null };
  }
}
