import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { Game } from '../../core/models/game.model';
import { OwnershipType } from '../../core/models/library-entry.model';
import { GameService } from '../../core/services/game';
import { LibraryService } from '../../core/services/library';
import { PendingBadge } from '../../shared/components/pending-badge/pending-badge';
import { StarScore } from '../../shared/components/star-score/star-score';
import { FieldError } from '../../shared/components/field-error/field-error';
import { AddGameForm } from './add-game-form/add-game-form';

@Component({
  selector: 'app-search-add-game',
  imports: [ReactiveFormsModule, PendingBadge, StarScore, FieldError, AddGameForm],
  templateUrl: './search-add-game.html',
  styleUrl: './search-add-game.scss',
})
export class SearchAddGame {
  private readonly gameService = inject(GameService);
  private readonly libraryService = inject(LibraryService);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly form = this.formBuilder.nonNullable.group({ query: [''] });
  protected readonly results = signal<Game[] | null>(null);
  protected readonly searching = signal(false);
  protected readonly showAddForm = signal(false);
  protected readonly addingGameId = signal<number | null>(null);
  protected readonly ownershipType = signal<OwnershipType>('digital');
  protected readonly pricePaid = signal('');
  protected readonly errorMessage = signal<string | null>(null);

  search(): void {
    const query = this.form.getRawValue().query.trim();
    if (!query) return;
    this.searching.set(true);
    this.showAddForm.set(false);
    this.errorMessage.set(null);
    this.gameService.search(query).subscribe({
      next: (results) => {
        this.results.set(results);
        this.searching.set(false);
      },
      error: () => {
        this.searching.set(false);
        this.errorMessage.set('Search failed. Please try again.');
      },
    });
  }

  startAdding(gameId: number): void {
    this.addingGameId.set(gameId);
    this.ownershipType.set('digital');
    this.pricePaid.set('');
    this.errorMessage.set(null);
  }

  confirmAdd(gameId: number): void {
    this.libraryService
      .add({ game_id: gameId, ownership_type: this.ownershipType(), price_paid: this.pricePaid() || null })
      .subscribe({
        next: () => this.router.navigateByUrl('/my-games'),
        error: (error: { error?: { detail?: string } }) =>
          this.errorMessage.set(error.error?.detail ?? 'Could not add this game to your library.'),
      });
  }

  onGameCreated(game: Game): void {
    this.results.set([game]);
    this.showAddForm.set(false);
    this.startAdding(game.id);
  }
}
