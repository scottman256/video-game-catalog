import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { LibraryEntry, LibrarySortField, SortDirection } from '../../core/models/library-entry.model';
import { LibraryService } from '../../core/services/library';
import { PendingBadge } from '../../shared/components/pending-badge/pending-badge';
import { StarScore } from '../../shared/components/star-score/star-score';

@Component({
  selector: 'app-my-games',
  imports: [RouterLink, PendingBadge, StarScore],
  templateUrl: './my-games.html',
  styleUrl: './my-games.scss',
})
export class MyGames {
  private readonly libraryService = inject(LibraryService);

  protected readonly entries = signal<LibraryEntry[]>([]);
  protected readonly sort = signal<LibrarySortField>('title');
  protected readonly direction = signal<SortDirection>('asc');
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  constructor() {
    this.load();
  }

  changeSort(sort: LibrarySortField): void {
    this.sort.set(sort);
    this.load();
  }

  toggleDirection(): void {
    this.direction.set(this.direction() === 'asc' ? 'desc' : 'asc');
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.libraryService.list(this.sort(), this.direction()).subscribe({
      next: (entries) => {
        this.entries.set(entries);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('Could not load your games. Please try again.');
      },
    });
  }
}
