import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';

import { Game } from '../../core/models/game.model';
import { GameService } from '../../core/services/game';
import { LibraryService } from '../../core/services/library';
import { WishlistService } from '../../core/services/wishlist';
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
  in_wishlist: false,
  is_approved: true,
};

describe('SearchAddGame', () => {
  let searchCalls: string[];
  let addCalls: unknown[];
  let searchResult: Observable<Game[]>;
  let addResult: Observable<unknown>;
  let wishlistCalls: unknown[];
  let wishlistResult: Observable<unknown>;

  beforeEach(async () => {
    searchCalls = [];
    addCalls = [];
    searchResult = of([GAME]);
    addResult = of({});
    wishlistCalls = [];
    wishlistResult = of({});
    const gameStub = { search: (q: string) => (searchCalls.push(q), searchResult) };
    const libraryStub = { add: (payload: unknown) => (addCalls.push(payload), addResult) };
    const wishlistStub = { add: (payload: unknown) => (wishlistCalls.push(payload), wishlistResult) };

    await TestBed.configureTestingModule({
      imports: [SearchAddGame],
      providers: [
        provideRouter([]),
        { provide: GameService, useValue: gameStub },
        { provide: LibraryService, useValue: libraryStub },
        { provide: WishlistService, useValue: wishlistStub },
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

  function buttonLabels(fixture: ReturnType<typeof searchAndRender>): string[] {
    const buttons = fixture.nativeElement.querySelectorAll('.results-list__item button') as NodeListOf<HTMLButtonElement>;
    return [...buttons].map((button) => button.textContent!.trim());
  }

  it('offers Add to Wishlist for a game that is not owned or wishlisted', () => {
    const fixture = searchAndRender(GAME);

    expect(buttonLabels(fixture)).toEqual(['Add to My Games', 'Add to Wishlist']);
  });

  it('shows a disabled On Wishlist button for a game already wishlisted', () => {
    const fixture = searchAndRender({ ...GAME, in_wishlist: true });

    const onWishlist = fixture.nativeElement.querySelectorAll('.results-list__item button')[1];
    expect(onWishlist.textContent.trim()).toBe('On Wishlist');
    expect(onWishlist.disabled).toBe(true);
  });

  it('does not offer the wishlist for a game already owned', () => {
    const fixture = searchAndRender({ ...GAME, in_library: true });

    expect(buttonLabels(fixture)).toEqual(['Add to My Games']);
  });

  it('adds a game to the wishlist with a target price and marks it in the results', () => {
    const fixture = searchAndRender(GAME);
    fixture.componentInstance.startWishlisting(1);
    fixture.componentInstance['targetPrice'].set('29.99');

    fixture.componentInstance.confirmWishlist(1);

    expect(wishlistCalls).toEqual([{ game_id: 1, target_price: '29.99' }]);
    expect(fixture.componentInstance['results']()![0].in_wishlist).toBe(true);
    expect(fixture.componentInstance['wishlistingGameId']()).toBeNull();
  });

  it('sends a null target price when none is entered', () => {
    const fixture = searchAndRender(GAME);
    fixture.componentInstance.startWishlisting(1);

    fixture.componentInstance.confirmWishlist(1);

    expect(wishlistCalls).toEqual([{ game_id: 1, target_price: null }]);
  });

  it('surfaces the backend reason when adding to the wishlist fails', () => {
    wishlistResult = throwError(() => ({ error: { detail: 'You already own this game' } }));
    const fixture = searchAndRender(GAME);
    fixture.componentInstance.startWishlisting(1);

    fixture.componentInstance.confirmWishlist(1);

    expect(fixture.componentInstance['errorMessage']()).toBe('You already own this game');
  });

  it('closes the wishlist form when starting to add to the library instead', () => {
    const fixture = searchAndRender(GAME);
    fixture.componentInstance.startWishlisting(1);

    fixture.componentInstance.startAdding(1);

    expect(fixture.componentInstance['wishlistingGameId']()).toBeNull();
    expect(fixture.componentInstance['addingGameId']()).toBe(1);
  });
});
