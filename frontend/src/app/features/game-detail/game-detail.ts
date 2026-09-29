import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';

import { Game } from '../../core/models/game.model';
import { LibraryEntry } from '../../core/models/library-entry.model';
import { Review } from '../../core/models/review.model';
import { GameService } from '../../core/services/game';
import { LibraryService } from '../../core/services/library';
import { ReviewService } from '../../core/services/review';
import { ImageCarousel } from '../../shared/components/image-carousel/image-carousel';
import { ImageModal } from '../../shared/components/image-modal/image-modal';
import { PendingBadge } from '../../shared/components/pending-badge/pending-badge';
import { StarScore } from '../../shared/components/star-score/star-score';
import { OwnershipForm } from './ownership-form/ownership-form';
import { PlayProgressForm } from './play-progress-form/play-progress-form';
import { ReviewForm } from './review-form/review-form';

@Component({
  selector: 'app-game-detail',
  imports: [ImageCarousel, ImageModal, PendingBadge, StarScore, OwnershipForm, PlayProgressForm, ReviewForm],
  templateUrl: './game-detail.html',
  styleUrl: './game-detail.scss',
})
export class GameDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly gameService = inject(GameService);
  private readonly libraryService = inject(LibraryService);
  private readonly reviewService = inject(ReviewService);

  protected readonly libraryEntry = signal<LibraryEntry | null>(null);
  protected readonly game = signal<Game | null>(null);
  protected readonly review = signal<Review | null>(null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly activeImageUrl = signal<string | null>(null);
  protected readonly screenshotUrls = computed(
    () => this.game()?.images.filter((image) => image.kind === 'screenshot').map((image) => image.url) ?? [],
  );
  protected readonly boxArtUrl = computed(
    () => this.game()?.images.find((image) => image.kind === 'box_art')?.url ?? null,
  );

  constructor() {
    const libraryId = Number(this.route.snapshot.paramMap.get('id'));
    this.libraryService.getById(libraryId).subscribe({
      next: (entry) => this.loadGameAndReview(entry, libraryId),
      error: () => this.handleLoadError(),
    });
  }

  onLibraryEntrySaved(entry: LibraryEntry): void {
    this.libraryEntry.set(entry);
  }

  onReviewSaved(review: Review): void {
    this.review.set(review);
  }

  private loadGameAndReview(entry: LibraryEntry, libraryId: number): void {
    this.libraryEntry.set(entry);
    forkJoin({
      game: this.gameService.getById(entry.game.id),
      review: this.reviewService.get(libraryId),
    }).subscribe({
      next: ({ game, review }) => {
        this.game.set(game);
        this.review.set(review);
        this.loading.set(false);
      },
      error: () => this.handleLoadError(),
    });
  }

  private handleLoadError(): void {
    this.loading.set(false);
    this.errorMessage.set('Could not load this game. Please go back and try again.');
  }
}
