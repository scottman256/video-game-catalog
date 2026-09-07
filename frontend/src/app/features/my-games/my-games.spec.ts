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
  },
  ownership_type: 'digital',
  price_paid: null,
  added_at: '2024-01-01T00:00:00Z',
  weighted_score: 4.5,
};

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

  it('stops loading and shows an error when the request fails', () => {
    listResult = throwError(() => new Error('failed'));
    const fixture = TestBed.createComponent(MyGames);
    fixture.detectChanges();

    expect(fixture.componentInstance['loading']()).toBe(false);
    expect(fixture.componentInstance['errorMessage']()).toBe('Could not load your games. Please try again.');
  });
});
