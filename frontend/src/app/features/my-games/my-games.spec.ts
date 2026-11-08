import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NEVER, Observable, of, throwError } from 'rxjs';

import { LibraryEntry } from '../../core/models/library-entry.model';
import { LibraryService } from '../../core/services/library';
import { buttonWithText, enterValue } from '../../testing/dom';
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

const ZELDA: LibraryEntry = {
  ...ENTRY,
  id: 2,
  game: {
    ...ENTRY.game,
    id: 11,
    title: 'Zelda',
    system: { id: 2, name: 'SNES', release_year: 1991 },
  },
  ownership_type: 'physical',
  weighted_score: 2,
};

function countLineParts(element: HTMLElement): string[] {
  const parts = [...element.querySelectorAll('.game-count > span')] as HTMLElement[];
  return parts.map((part) => part.textContent!.trim());
}

function cardTitles(element: HTMLElement): string[] {
  return [...element.querySelectorAll('.game-card h3')].map((title) => title.textContent!.trim());
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

  function render(...entries: LibraryEntry[]): ComponentFixture<MyGames> {
    if (entries.length) listResult = of(entries);
    const fixture = TestBed.createComponent(MyGames);
    fixture.detectChanges();
    return fixture;
  }

  function choose(fixture: ComponentFixture<MyGames>, selector: string, value: string): void {
    enterValue(fixture.nativeElement.querySelector(selector), value);
    fixture.detectChanges();
  }

  function click(fixture: ComponentFixture<MyGames>, label: string, root?: HTMLElement): void {
    buttonWithText(root ?? fixture.nativeElement, label).click();
    fixture.detectChanges();
  }

  it('loads the library sorted by title ascending by default', () => {
    render();

    expect(listCalls).toEqual([['title', 'asc']]);
  });

  it('renders the loaded entries', () => {
    const fixture = render();

    expect(cardTitles(fixture.nativeElement)).toEqual(['Mario']);
    expect(fixture.nativeElement.querySelector('.game-card__art-placeholder')).not.toBeNull();
  });

  it('shows box art when a game has it', () => {
    const fixture = render({ ...ENTRY, game: { ...ENTRY.game, box_art_url: '/cover.png' } });

    expect(fixture.nativeElement.querySelector('.game-card img').getAttribute('src')).toBe(
      '/cover.png',
    );
  });

  it('shows a loading message until the library arrives', () => {
    listResult = NEVER;

    expect(render().nativeElement.textContent).toContain('Loading…');
  });

  it('invites searching for games when the catalog is empty', () => {
    listResult = of([]);

    expect(render().nativeElement.textContent).toContain('Your catalog is empty.');
  });

  it('reloads with the new sort field when changed', () => {
    const fixture = render();

    choose(fixture, '#sort', 'rating');

    expect(listCalls).toEqual([
      ['title', 'asc'],
      ['rating', 'asc'],
    ]);
  });

  it('toggles the sort direction back and forth', () => {
    const fixture = render();

    click(fixture, '↑ Ascending');
    click(fixture, '↓ Descending');

    expect(listCalls).toEqual([
      ['title', 'asc'],
      ['title', 'desc'],
      ['title', 'asc'],
    ]);
  });

  it('marks pending games with the pending approval pill', () => {
    const fixture = render(ENTRY, {
      ...ENTRY,
      id: 2,
      game: { ...ENTRY.game, id: 11, is_approved: false },
    });

    const cards = fixture.nativeElement.querySelectorAll('.game-card');
    expect(cards[0].querySelector('app-pending-badge')).toBeNull();
    expect(cards[1].querySelector('app-pending-badge')).not.toBeNull();
  });

  it('shows completion badges and hours played on each owned game', () => {
    const fixture = render(
      { ...ENTRY, completed_on: '2026-09-01', hours_played: '10.0' },
      { ...ENTRY, id: 2, completed_on: '2026-09-01', fully_completed_on: '2026-09-20' },
      { ...ENTRY, id: 3 },
    );

    const cards = [...fixture.nativeElement.querySelectorAll('.game-card')] as HTMLElement[];
    expect(cards[0].querySelector('.status-badge')!.textContent).toContain('Completed');
    expect(cards[0].querySelector('.hours-played')!.textContent).toBe('10 hrs played');
    expect(cards[1].querySelector('.status-badge')!.textContent).toContain('100%');
    expect(cards[2].querySelector('.status-badge')).toBeNull();
  });

  it('shows total hours, completed and 100% counts after the game count', () => {
    const fixture = render(
      { ...ENTRY, completed_on: '2026-09-01', hours_played: '10.5' },
      {
        ...ENTRY,
        id: 2,
        completed_on: '2026-09-01',
        fully_completed_on: '2026-09-20',
        hours_played: '30.0',
      },
      { ...ENTRY, id: 3 },
    );

    expect(countLineParts(fixture.nativeElement)).toEqual([
      '3 games',
      '40.5 hrs played',
      '2 completed',
      '1 at 100%',
    ]);
  });

  it('uses the singular for a single game and leaves out zero completed and 100% counts', () => {
    const fixture = render();

    expect(countLineParts(fixture.nativeElement)).toEqual(['1 game', '0 hrs played']);
  });

  it('filters by title and shows totals for just the matching games', () => {
    const fixture = render(
      { ...ENTRY, completed_on: '2026-09-01', hours_played: '10.0' },
      { ...ZELDA, hours_played: '5.0' },
    );

    choose(fixture, '[aria-label="Search my games by title"]', 'zel');

    expect(cardTitles(fixture.nativeElement)).toEqual(['Zelda']);
    expect(countLineParts(fixture.nativeElement)).toEqual(['Showing 1 of 2 games', '5 hrs played']);
    expect(
      fixture.nativeElement.querySelector('.game-count--filtered .game-count__scope'),
    ).not.toBeNull();
  });

  it('uses the singular for the total when filtering a one-game library', () => {
    const fixture = render();

    choose(fixture, '[aria-label="Search my games by title"]', 'mar');

    expect(countLineParts(fixture.nativeElement)[0]).toBe('Showing 1 of 1 game');
  });

  it('filters by system using the systems in the library', () => {
    const fixture = render(ENTRY, ZELDA);

    choose(fixture, '[aria-label="Filter by system"]', '2');

    expect(cardTitles(fixture.nativeElement)).toEqual(['Zelda']);
  });

  it('filters by ownership, and "Digital & physical" shows everything again', () => {
    const fixture = render(ENTRY, ZELDA);

    choose(fixture, '[aria-label="Filter by ownership"]', 'physical');
    expect(cardTitles(fixture.nativeElement)).toEqual(['Zelda']);

    choose(fixture, '[aria-label="Filter by ownership"]', '');
    expect(cardTitles(fixture.nativeElement)).toEqual(['Mario', 'Zelda']);
  });

  it('filters by minimum and maximum rating, treating the blank option as no limit', () => {
    const fixture = render(ENTRY, ZELDA);

    choose(fixture, '[aria-label="Min rating"]', '4');
    expect(cardTitles(fixture.nativeElement)).toEqual(['Mario']);

    choose(fixture, '[aria-label="Min rating"]', '');
    choose(fixture, '[aria-label="Max rating"]', '3');
    expect(cardTitles(fixture.nativeElement)).toEqual(['Zelda']);
  });

  it('labels the top minimum rating as just 5★, since nothing rates higher', () => {
    const fixture = render();

    const minRatingOptions = fixture.nativeElement.querySelectorAll(
      'select[aria-label="Min rating"] option',
    );
    const labels = [...minRatingOptions].map((option) =>
      (option as HTMLOptionElement).textContent!.trim(),
    );
    expect(labels).toEqual([
      'Min rating',
      '1★ or more',
      '2★ or more',
      '3★ or more',
      '4★ or more',
      '5★',
    ]);
  });

  it('clears active filters from the filter bar', () => {
    const fixture = render(ENTRY, ZELDA);
    choose(fixture, '[aria-label="Filter by ownership"]', 'physical');

    click(fixture, 'Clear filters', fixture.nativeElement.querySelector('.filter-bar'));

    expect(cardTitles(fixture.nativeElement)).toEqual(['Mario', 'Zelda']);
    expect(fixture.nativeElement.querySelector('.filter-bar button')).toBeNull();
  });

  it('shows a clear-filters prompt when nothing matches, and clearing restores the list', () => {
    const fixture = render();
    choose(fixture, '[aria-label="Search my games by title"]', 'no such game');
    expect(fixture.nativeElement.textContent).toContain('No games match these filters.');

    click(fixture, 'Clear filters', fixture.nativeElement.querySelector('.empty-state'));

    expect(cardTitles(fixture.nativeElement)).toEqual(['Mario']);
  });

  it('stops loading and shows an error when the request fails', () => {
    listResult = throwError(() => new Error('failed'));

    const fixture = render();

    expect(fixture.nativeElement.textContent).toContain(
      'Could not load your games. Please try again.',
    );
    expect(fixture.nativeElement.textContent).not.toContain('Loading…');
  });
});
