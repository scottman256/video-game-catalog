import { Component, OnInit, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin, of, switchMap } from 'rxjs';

import { Game } from '../../../core/models/game.model';
import { GameSystem } from '../../../core/models/system.model';
import { GameService } from '../../../core/services/game';
import { SystemService } from '../../../core/services/system';
import { FieldError } from '../../../shared/components/field-error/field-error';

const ESRB_RATINGS = ['EC', 'E', 'E10+', 'T', 'M', 'AO', 'RP'];

@Component({
  selector: 'app-add-game-form',
  imports: [ReactiveFormsModule, FieldError],
  templateUrl: './add-game-form.html',
  styleUrl: './add-game-form.scss',
})
export class AddGameForm implements OnInit {
  private readonly gameService = inject(GameService);
  private readonly systemService = inject(SystemService);
  private readonly formBuilder = inject(FormBuilder);

  readonly created = output<Game>();

  protected readonly esrbRatings = ESRB_RATINGS;
  protected readonly systems = signal<GameSystem[]>([]);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected boxArtFile: File | null = null;
  protected screenshotFiles: File[] = [];

  protected readonly form = this.formBuilder.nonNullable.group({
    title: ['', Validators.required],
    summary: [''],
    release_year: [new Date().getFullYear(), [Validators.required, Validators.min(1970)]],
    system_id: [0, Validators.required],
    esrb_rating: ['E', Validators.required],
  });

  ngOnInit(): void {
    this.systemService.list().subscribe((systems) => this.systems.set(systems));
  }

  onBoxArtSelected(event: Event): void {
    this.boxArtFile = (event.target as HTMLInputElement).files?.[0] ?? null;
  }

  onScreenshotsSelected(event: Event): void {
    this.screenshotFiles = Array.from((event.target as HTMLInputElement).files ?? []);
  }

  submit(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.errorMessage.set(null);
    const { title, summary, release_year, system_id, esrb_rating } = this.form.getRawValue();
    this.gameService
      .create({ title, summary: summary || null, release_year, system_id, esrb_rating })
      .pipe(switchMap((game) => this.uploadImages(game)))
      .subscribe({
        next: (game) => {
          this.saving.set(false);
          this.created.emit(game);
        },
        error: (error: { error?: { detail?: string } }) => this.handleError(error),
      });
  }

  private handleError(error: { error?: { detail?: string } }): void {
    this.saving.set(false);
    this.errorMessage.set(error.error?.detail ?? 'Could not add this game. Please check the form and try again.');
  }

  private uploadImages(game: Game) {
    const uploads = [
      ...(this.boxArtFile ? [this.gameService.uploadImage(game.id, 'box_art', this.boxArtFile)] : []),
      ...this.screenshotFiles.map((file) => this.gameService.uploadImage(game.id, 'screenshot', file)),
    ];
    if (uploads.length === 0) return of(game);
    return forkJoin(uploads).pipe(switchMap(() => this.gameService.getById(game.id)));
  }
}
