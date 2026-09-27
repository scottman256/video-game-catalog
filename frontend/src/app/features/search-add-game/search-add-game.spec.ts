import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';

import { Game } from '../../core/models/game.model';
import { GameService } from '../../core/services/game';
import { LibraryService } from '../../core/services/library';
import { SearchAddGame } from './search-add-game';

const GAME: Game = {
  id: 1,
  title: 'Mario',
  summary: null,
  release_year: 1985,
  esrb_rating: 'E',
  system: { id: 1, name: 'NES', release_year: 1985 },
  images: [],
  community_average_score: null,
  in_library: false,
  is_approved: true,
};

describe('SearchAddGame', () => {
  let searchCalls: string[];
  let addCalls: unknown[];
  let searchResult: Observable<Game[]>;
  let addResult: Observable<unknown>;

  beforeEach(async () => {
    searchCalls = [];
    addCalls = [];
    searchResult = of([GAME]);
    addResult = of({});
    const gameStub = { search: (q: string) => (searchCalls.push(q), searchResult) };
    const libraryStub = { add: (payload: unknown) => (addCalls.push(payload), addResult) };

    await TestBed.configureTestingModule({
      imports: [SearchAddGame],
      providers: [
        provideRouter([]),
        { provide: GameService, useValue: gameStub },
        { provide: LibraryService, useValue: libraryStub },
      ],
    }).compileComponents();

    const router = TestBed.inject(Router);
    router.navigateByUrl = (() => Promise.resolve(true)) as typeof router.navigateByUrl;
  });

  it('does not search with a blank query', () => {
    const fixture = TestBed.createComponent(SearchAddGame);
    fixture.detectChanges();

    fixture.componentInstance.search();

    expect(searchCalls.length).toBe(0);
  });

  it('searches and stores the results', () => {
    const fixture = TestBed.createComponent(SearchAddGame);
    fixture.detectChanges();
    fixture.componentInstance['form'].setValue({ query: 'mario' });

    fixture.componentInstance.search();

    expect(searchCalls).toEqual(['mario']);
    expect(fixture.componentInstance['results']()).toEqual([GAME]);
  });

  it('adds a game to the library with the chosen ownership and price', () => {
    const fixture = TestBed.createComponent(SearchAddGame);
    fixture.detectChanges();
    fixture.componentInstance.startAdding(1);
    fixture.componentInstance['ownershipType'].set('physical');
    fixture.componentInstance['pricePaid'].set('9.99');

    fixture.componentInstance.confirmAdd(1);

    expect(addCalls).toEqual([{ game_id: 1, ownership_type: 'physical', price_paid: '9.99' }]);
  });

  it('shows a newly created game and opens the add-to-library form for it', () => {
    const fixture = TestBed.createComponent(SearchAddGame);
    fixture.detectChanges();

    fixture.componentInstance.onGameCreated(GAME);

    expect(fixture.componentInstance['results']()).toEqual([GAME]);
    expect(fixture.componentInstance['addingGameId']()).toBe(1);
  });

  it('stops the spinner and shows an error when search fails', () => {
    searchResult = throwError(() => new Error('failed'));
    const fixture = TestBed.createComponent(SearchAddGame);
    fixture.detectChanges();
    fixture.componentInstance['form'].setValue({ query: 'mario' });

    fixture.componentInstance.search();

    expect(fixture.componentInstance['searching']()).toBe(false);
    expect(fixture.componentInstance['errorMessage']()).toBe('Search failed. Please try again.');
  });

  it('shows an error when adding to the library fails, instead of failing silently', () => {
    addResult = throwError(() => new Error('failed'));
    const fixture = TestBed.createComponent(SearchAddGame);
    fixture.detectChanges();
    fixture.componentInstance.startAdding(1);

    fixture.componentInstance.confirmAdd(1);

    expect(fixture.componentInstance['errorMessage']()).toBe('Could not add this game to your library.');
  });

  it('surfaces the backend-provided reason when adding a duplicate game', () => {
    addResult = throwError(() => ({ error: { detail: 'Game is already in your library' } }));
    const fixture = TestBed.createComponent(SearchAddGame);
    fixture.detectChanges();
    fixture.componentInstance.startAdding(1);

    fixture.componentInstance.confirmAdd(1);

    expect(fixture.componentInstance['errorMessage']()).toBe('Game is already in your library');
  });

  it('does not show a rating at all for a global catalog game nobody has reviewed yet', () => {
    searchResult = of([{ ...GAME, community_average_score: null }]);
    const fixture = TestBed.createComponent(SearchAddGame);
    fixture.detectChanges();
    fixture.componentInstance['form'].setValue({ query: 'mario' });

    fixture.componentInstance.search();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-star-score')).toBeNull();
  });

  it('shows the community average when the game already has reviews', () => {
    searchResult = of([{ ...GAME, community_average_score: 4.2 }]);
    const fixture = TestBed.createComponent(SearchAddGame);
    fixture.detectChanges();
    fixture.componentInstance['form'].setValue({ query: 'mario' });

    fixture.componentInstance.search();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-star-score')).not.toBeNull();
  });

  function searchAndRender(game: Game) {
    searchResult = of([game]);
    const fixture = TestBed.createComponent(SearchAddGame);
    fixture.detectChanges();
    fixture.componentInstance['form'].setValue({ query: 'mario' });
    fixture.componentInstance.search();
    fixture.detectChanges();
    return fixture;
  }

  it('offers an enabled add button for a game not yet owned', () => {
    const fixture = searchAndRender({ ...GAME, in_library: false });

    const button = fixture.nativeElement.querySelector('.results-list__item button.btn-secondary');
    expect(button.disabled).toBe(false);
    expect(fixture.nativeElement.querySelector('.results-list__owned')).toBeNull();
  });

  it('disables the add button for a game already in the library', () => {
    const fixture = searchAndRender({ ...GAME, in_library: true });

    const button = fixture.nativeElement.querySelector('.results-list__item button.btn-secondary');
    expect(button.disabled).toBe(true);
  });

  it('explains on hover why the add button is disabled', () => {
    const fixture = searchAndRender({ ...GAME, in_library: true });

    const wrapper = fixture.nativeElement.querySelector('.results-list__owned');
    expect(wrapper.getAttribute('title')).toBe('You already own this game');
  });

  it('marks the submitter\'s own pending game in the results', () => {
    const fixture = searchAndRender({ ...GAME, is_approved: false });

    expect(fixture.nativeElement.querySelector('.results-list__item app-pending-badge')).not.toBeNull();
  });

  it('shows no pending pill for approved games', () => {
    const fixture = searchAndRender(GAME);

    expect(fixture.nativeElement.querySelector('app-pending-badge')).toBeNull();
  });

  it('does not start the add flow for a game already owned', () => {
    const fixture = searchAndRender({ ...GAME, in_library: true });

    fixture.nativeElement.querySelector('.results-list__item button.btn-secondary').click();
    fixture.detectChanges();

    expect(fixture.componentInstance['addingGameId']()).toBeNull();
  });
});
