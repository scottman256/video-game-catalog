import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { LibraryEntry, LibrarySortField, SortDirection } from '../../core/models/library-entry.model';
import { LibraryService } from '../../core/services/library';
import { PendingBadge } from '../../shared/components/pending-badge/pending-badge';
import { PlayStatus } from '../../shared/components/play-status/play-status';
import { StarScore } from '../../shared/components/star-score/star-score';
import { formatHoursPlayed } from '../../shared/utils/hours';
import { LibraryFilters, NO_FILTERS, filterLibrary, hasActiveFilters, systemsInLibrary } from './library-filter';
import { summarizeLibrary } from './library-summary';

@Component({
  selector: 'app-my-games',
  imports: [RouterLink, PendingBadge, PlayStatus, StarScore],
  templateUrl: './my-games.html',
  styleUrl: './my-games.scss',
})
export class MyGames {
  private readonly libraryService = inject(LibraryService);

  protected readonly entries = signal<LibraryEntry[]>([]);
  protected readonly sort = signal<LibrarySortField>('title');
  protected readonly direction = signal<SortDirection>('asc');
  protected readonly filters = signal<LibraryFilters>(NO_FILTERS);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly visibleEntries = computed(() => filterLibrary(this.entries(), this.filters()));
  protected readonly systems = computed(() => systemsInLibrary(this.entries()));
  protected readonly filtering = computed(() => hasActiveFilters(this.filters()));
  protected readonly summary = computed(() => summarizeLibrary(this.visibleEntries()));
  protected readonly hoursLabel = computed(() => formatHoursPlayed(this.summary().hoursPlayed));
  protected readonly ratingOptions = [1, 2, 3, 4, 5];

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

  updateFilter<K extends keyof LibraryFilters>(key: K, value: LibraryFilters[K]): void {
    this.filters.update((current) => ({ ...current, [key]: value }));
  }

  /** Select elements report '' for the "Any" option; the filters use null for "not set". */
  updateNumberFilter(key: 'systemId' | 'minRating' | 'maxRating', rawValue: string): void {
    this.updateFilter(key, rawValue === '' ? null : Number(rawValue));
  }

  clearFilters(): void {
    this.filters.set(NO_FILTERS);
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
