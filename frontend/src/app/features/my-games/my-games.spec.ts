import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';

import { LibraryEntry } from '../../core/models/library-entry.model';
import { LibraryService } from '../../core/services/library';
import { MyGames } from './my-games';

const ENTRY: LibraryEntry = {
  id: 1,
  game: {
    id: 10,
    title: 'Mario',
    release_year: 1985,
    system: { id: 1, name: 'NES', release_year: 1985 },
    box_art_url: null,
    is_approved: true,
  },
  ownership_type: 'digital',
  price_paid: null,
  added_at: '2024-01-01T00:00:00Z',
  weighted_score: 4.5,
  completed_on: null,
  fully_completed_on: null,
  hours_played: null,
};

function countLineParts(element: HTMLElement): string[] {
  const parts = [...element.querySelectorAll('.game-count > span')] as HTMLElement[];
  return parts.map((part) => part.textContent!.trim());
}

describe('MyGames', () => {
  let listCalls: unknown[];
  let listResult: Observable<LibraryEntry[]>;

  beforeEach(async () => {
    listCalls = [];
    listResult = of([ENTRY]);
    const libraryStub = {
      list: (sort: string, direction: string) => (listCalls.push([sort, direction]), listResult),
    };

    await TestBed.configureTestingModule({
      imports: [MyGames],
      providers: [provideRouter([]), { provide: LibraryService, useValue: libraryStub }],
    }).compileComponents();
  });

  it('loads the library sorted by title ascending by default', () => {
    TestBed.createComponent(MyGames);

    expect(listCalls).toEqual([['title', 'asc']]);
  });

  it('renders the loaded entries', () => {
    const fixture = TestBed.createComponent(MyGames);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Mario');
  });

  it('reloads with the new sort field when changed', () => {
    const fixture = TestBed.createComponent(MyGames);
    fixture.detectChanges();

    fixture.componentInstance.changeSort('rating');

    expect(listCalls).toEqual([
      ['title', 'asc'],
      ['rating', 'asc'],
    ]);
  });

  it('toggles sort direction', () => {
    const fixture = TestBed.createComponent(MyGames);
    fixture.detectChanges();

    fixture.componentInstance.toggleDirection();

    expect(listCalls).toEqual([
      ['title', 'asc'],
      ['title', 'desc'],
    ]);
  });

  it('marks pending games with the pending approval pill', () => {
    listResult = of([ENTRY, { ...ENTRY, id: 2, game: { ...ENTRY.game, id: 11, is_approved: false } }]);
    const fixture = TestBed.createComponent(MyGames);
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('.game-card');
    expect(cards[0].querySelector('app-pending-badge')).toBeNull();
    expect(cards[1].querySelector('app-pending-badge')).not.toBeNull();
  });

  it('shows completion badges and hours played on each owned game', () => {
    listResult = of([
      { ...ENTRY, completed_on: '2026-09-01', hours_played: '10.0' },
      { ...ENTRY, id: 2, completed_on: '2026-09-01', fully_completed_on: '2026-09-20' },
      { ...ENTRY, id: 3 },
    ]);
    const fixture = TestBed.createComponent(MyGames);
    fixture.detectChanges();

    const cards = [...fixture.nativeElement.querySelectorAll('.game-card')] as HTMLElement[];
    expect(cards[0].querySelector('.status-badge')!.textContent).toContain('Completed');
    expect(cards[0].querySelector('.hours-played')!.textContent).toBe('10 hrs played');
    expect(cards[1].querySelector('.status-badge')!.textContent).toContain('100%');
    expect(cards[2].querySelector('.status-badge')).toBeNull();
  });

  it('shows total hours, completed and 100% counts after the game count', () => {
    listResult = of([
      { ...ENTRY, completed_on: '2026-09-01', hours_played: '10.5' },
      { ...ENTRY, id: 2, completed_on: '2026-09-01', fully_completed_on: '2026-09-20', hours_played: '30.0' },
      { ...ENTRY, id: 3 },
    ]);
    const fixture = TestBed.createComponent(MyGames);
    fixture.detectChanges();

    expect(countLineParts(fixture.nativeElement)).toEqual([
      '3 games',
      '40.5 hrs played',
      '2 completed',
      '1 at 100%',
    ]);
  });

  it('leaves out the completed and 100% counts when they are zero', () => {
    const fixture = TestBed.createComponent(MyGames);
    fixture.detectChanges();

    expect(countLineParts(fixture.nativeElement)).toEqual(['1 game', '0 hrs played']);
  });

  it('shows totals for just the filtered games and marks the line as filtered', () => {
    listResult = of([
      { ...ENTRY, completed_on: '2026-09-01', hours_played: '10.0' },
      { ...ENTRY, id: 2, game: { ...ENTRY.game, id: 11, title: 'Zelda' }, hours_played: '5.0' },
    ]);
    const fixture = TestBed.createComponent(MyGames);
    fixture.detectChanges();

    fixture.componentInstance.updateFilter('titleQuery', 'zelda');
    fixture.detectChanges();

    expect(countLineParts(fixture.nativeElement)).toEqual(['Showing 1 of 2 games', '5 hrs played']);
    expect(fixture.nativeElement.querySelector('.game-count--filtered .game-count__scope')).not.toBeNull();
  });

  it('shows the total number of games', () => {
    listResult = of([ENTRY, { ...ENTRY, id: 2 }]);
    const fixture = TestBed.createComponent(MyGames);
    fixture.detectChanges();

    expect(countLineParts(fixture.nativeElement)[0]).toBe('2 games');
  });

  it('uses the singular for a single game', () => {
    const fixture = TestBed.createComponent(MyGames);
    fixture.detectChanges();

    expect(countLineParts(fixture.nativeElement)[0]).toBe('1 game');
  });

  it('filters the visible games and shows how many match', () => {
    listResult = of([ENTRY, { ...ENTRY, id: 2, game: { ...ENTRY.game, id: 11, title: 'Zelda' } }]);
    const fixture = TestBed.createComponent(MyGames);
    fixture.detectChanges();

    fixture.componentInstance.updateFilter('titleQuery', 'zel');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.game-card').length).toBe(1);
    expect(countLineParts(fixture.nativeElement)[0]).toBe('Showing 1 of 2 games');
  });

  it('labels the top minimum rating as just 5★, since nothing rates higher', () => {
    const fixture = TestBed.createComponent(MyGames);
    fixture.detectChanges();

    const minRatingOptions = fixture.nativeElement.querySelectorAll('select[aria-label="Min rating"] option');
    const labels = [...minRatingOptions].map((option) => (option as HTMLOptionElement).textContent!.trim());
    expect(labels).toEqual(['Min rating', '1★ or more', '2★ or more', '3★ or more', '4★ or more', '5★']);
  });

  it('treats the "any" option of a numeric filter as no filter', () => {
    const fixture = TestBed.createComponent(MyGames);
    fixture.componentInstance.updateNumberFilter('minRating', '4');
    fixture.componentInstance.updateNumberFilter('systemId', '');

    expect(fixture.componentInstance['filters']()).toEqual(expect.objectContaining({ minRating: 4, systemId: null }));
  });

  it('shows a clear-filters prompt when nothing matches, and clearing restores the list', () => {
    const fixture = TestBed.createComponent(MyGames);
    fixture.detectChanges();
    fixture.componentInstance.updateFilter('titleQuery', 'no such game');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No games match these filters.');

    fixture.componentInstance.clearFilters();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.game-card').length).toBe(1);
  });

  it('stops loading and shows an error when the request fails', () => {
    listResult = throwError(() => new Error('failed'));
    const fixture = TestBed.createComponent(MyGames);
    fixture.detectChanges();

    expect(fixture.componentInstance['loading']()).toBe(false);
    expect(fixture.componentInstance['errorMessage']()).toBe('Could not load your games. Please try again.');
  });
});
