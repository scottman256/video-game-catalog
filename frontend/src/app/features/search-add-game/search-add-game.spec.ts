import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';

import { Game } from '../../core/models/game.model';
import { GameService } from '../../core/services/game';
import { LibraryService } from '../../core/services/library';
import { SystemService } from '../../core/services/system';
import { WishlistService } from '../../core/services/wishlist';
import { buttonTexts, buttonWithText, enterValue } from '../../testing/dom';
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
  let navigations: string[];

  beforeEach(async () => {
    searchCalls = [];
    addCalls = [];
    searchResult = of([GAME]);
    addResult = of({});
    wishlistCalls = [];
    wishlistResult = of({});
    navigations = [];
    const gameStub = { search: (q: string) => (searchCalls.push(q), searchResult) };
    const libraryStub = { add: (payload: unknown) => (addCalls.push(payload), addResult) };
    const wishlistStub = {
      add: (payload: unknown) => (wishlistCalls.push(payload), wishlistResult),
    };

    await TestBed.configureTestingModule({
      imports: [SearchAddGame],
      providers: [
        provideRouter([]),
        { provide: GameService, useValue: gameStub },
        { provide: LibraryService, useValue: libraryStub },
        { provide: WishlistService, useValue: wishlistStub },
        { provide: SystemService, useValue: { list: () => of([]) } },
      ],
    }).compileComponents();

    const router = TestBed.inject(Router);
    router.navigateByUrl = ((url: string) => (
      navigations.push(url),
      Promise.resolve(true)
    )) as typeof router.navigateByUrl;
  });

  function render(): ComponentFixture<SearchAddGame> {
    const fixture = TestBed.createComponent(SearchAddGame);
    fixture.detectChanges();
    return fixture;
  }

  function search(fixture: ComponentFixture<SearchAddGame>, query: string): void {
    enterValue(fixture.nativeElement.querySelector('input[aria-label="Search by title"]'), query);
    buttonWithText(fixture.nativeElement, 'Search').click();
    fixture.detectChanges();
  }

  function searchAndRender(...games: Game[]): ComponentFixture<SearchAddGame> {
    searchResult = of(games);
    const fixture = render();
    search(fixture, 'mario');
    return fixture;
  }

  function click(fixture: ComponentFixture<SearchAddGame>, label: string): void {
    buttonWithText(fixture.nativeElement, label).click();
    fixture.detectChanges();
  }

  function enter(fixture: ComponentFixture<SearchAddGame>, ariaLabel: string, value: string): void {
    enterValue(fixture.nativeElement.querySelector(`[aria-label="${ariaLabel}"]`), value);
  }

  function resultButtonLabels(fixture: ComponentFixture<SearchAddGame>): string[] {
    return buttonTexts(fixture.nativeElement, '.results-list__item button');
  }

  it('does not search with a blank query', () => {
    const fixture = render();

    search(fixture, '   ');

    expect(searchCalls.length).toBe(0);
  });

  it('searches by the entered title and lists the results', () => {
    const fixture = searchAndRender(GAME);

    expect(searchCalls).toEqual(['mario']);
    expect(fixture.nativeElement.querySelector('.results-list__item').textContent).toContain(
      '1985 · NES',
    );
  });

  it('says so when no games match the search', () => {
    const fixture = searchAndRender();

    expect(fixture.nativeElement.textContent).toContain('No games found for that title.');
  });

  it('re-enables searching and shows an error when search fails', () => {
    searchResult = throwError(() => new Error('failed'));
    const fixture = render();

    search(fixture, 'mario');

    expect(fixture.nativeElement.textContent).toContain('Search failed. Please try again.');
    expect(buttonWithText(fixture.nativeElement, 'Search').disabled).toBe(false);
  });

  it('adds a game to the library with the chosen ownership and price, then opens My Games', () => {
    const fixture = searchAndRender(GAME);
    click(fixture, 'Add to My Games');
    enter(fixture, 'Ownership type', 'physical');
    enter(fixture, 'Price paid', '9.99');

    click(fixture, 'Confirm');

    expect(addCalls).toEqual([{ game_id: 1, ownership_type: 'physical', price_paid: '9.99' }]);
    expect(navigations).toEqual(['/my-games']);
  });

  it('closes the add form when cancelled', () => {
    const fixture = searchAndRender(GAME);
    click(fixture, 'Add to My Games');

    click(fixture, 'Cancel');

    expect(resultButtonLabels(fixture)).toEqual(['Add to My Games', 'Add to Wishlist']);
  });

  it('shows an error when adding to the library fails, instead of failing silently', () => {
    addResult = throwError(() => new Error('failed'));
    const fixture = searchAndRender(GAME);
    click(fixture, 'Add to My Games');

    click(fixture, 'Confirm');

    expect(fixture.nativeElement.textContent).toContain('Could not add this game to your library.');
  });

  it('surfaces the backend-provided reason when adding a duplicate game', () => {
    addResult = throwError(() => ({ error: { detail: 'Game is already in your library' } }));
    const fixture = searchAndRender(GAME);
    click(fixture, 'Add to My Games');

    click(fixture, 'Confirm');

    expect(fixture.nativeElement.textContent).toContain('Game is already in your library');
  });

  it('does not show a rating at all for a global catalog game nobody has reviewed yet', () => {
    const fixture = searchAndRender({ ...GAME, community_average_score: null });

    expect(fixture.nativeElement.querySelector('app-star-score')).toBeNull();
  });

  it('shows the community average when the game already has reviews', () => {
    const fixture = searchAndRender({ ...GAME, community_average_score: 4.2 });

    expect(fixture.nativeElement.querySelector('app-star-score')).not.toBeNull();
  });

  it('offers an enabled add button for a game not yet owned', () => {
    const fixture = searchAndRender({ ...GAME, in_library: false });

    expect(buttonWithText(fixture.nativeElement, 'Add to My Games').disabled).toBe(false);
    expect(fixture.nativeElement.querySelector('.results-list__owned')).toBeNull();
  });

  it('disables the add button for a game already in the library and explains why on hover', () => {
    const fixture = searchAndRender({ ...GAME, in_library: true });

    expect(buttonWithText(fixture.nativeElement, 'Add to My Games').disabled).toBe(true);
    const wrapper = fixture.nativeElement.querySelector('.results-list__owned');
    expect(wrapper.getAttribute('title')).toBe('You already own this game');
  });

  it("marks the submitter's own pending game in the results", () => {
    const fixture = searchAndRender({ ...GAME, is_approved: false });

    expect(
      fixture.nativeElement.querySelector('.results-list__item app-pending-badge'),
    ).not.toBeNull();
  });

  it('shows no pending pill for approved games', () => {
    const fixture = searchAndRender(GAME);

    expect(fixture.nativeElement.querySelector('app-pending-badge')).toBeNull();
  });

  it('offers Add to Wishlist for a game that is not owned or wishlisted', () => {
    const fixture = searchAndRender(GAME);

    expect(resultButtonLabels(fixture)).toEqual(['Add to My Games', 'Add to Wishlist']);
  });

  it('shows a disabled On Wishlist button for a game already wishlisted', () => {
    const fixture = searchAndRender({ ...GAME, in_wishlist: true });

    expect(buttonWithText(fixture.nativeElement, 'On Wishlist').disabled).toBe(true);
  });

  it('does not offer the wishlist for a game already owned', () => {
    const fixture = searchAndRender({ ...GAME, in_library: true });

    expect(resultButtonLabels(fixture)).toEqual(['Add to My Games']);
  });

  it('adds a game to the wishlist with a target price and marks it in the results', () => {
    const fixture = searchAndRender(GAME);
    click(fixture, 'Add to Wishlist');
    enter(fixture, 'Target price', '29.99');

    click(fixture, 'Confirm');

    expect(wishlistCalls).toEqual([{ game_id: 1, target_price: '29.99' }]);
    expect(resultButtonLabels(fixture)).toEqual(['Add to My Games', 'On Wishlist']);
  });

  it('sends a null target price when none is entered', () => {
    const fixture = searchAndRender(GAME);
    click(fixture, 'Add to Wishlist');

    click(fixture, 'Confirm');

    expect(wishlistCalls).toEqual([{ game_id: 1, target_price: null }]);
  });

  it('closes the wishlist form when cancelled', () => {
    const fixture = searchAndRender(GAME);
    click(fixture, 'Add to Wishlist');

    click(fixture, 'Cancel');

    expect(wishlistCalls).toEqual([]);
    expect(resultButtonLabels(fixture)).toEqual(['Add to My Games', 'Add to Wishlist']);
  });

  it('surfaces the backend reason when adding to the wishlist fails', () => {
    wishlistResult = throwError(() => ({ error: { detail: 'You already own this game' } }));
    const fixture = searchAndRender(GAME);
    click(fixture, 'Add to Wishlist');

    click(fixture, 'Confirm');

    expect(fixture.nativeElement.textContent).toContain('You already own this game');
  });

  it('falls back to a generic message when adding to the wishlist fails without a reason', () => {
    wishlistResult = throwError(() => new Error('failed'));
    const fixture = searchAndRender(GAME);
    click(fixture, 'Add to Wishlist');

    click(fixture, 'Confirm');

    expect(fixture.nativeElement.textContent).toContain(
      'Could not add this game to your wishlist.',
    );
  });

  it('keeps only one inline form open across results', () => {
    const fixture = searchAndRender(GAME, { ...GAME, id: 2, title: 'Zelda' });
    const [mario, zelda] = fixture.nativeElement.querySelectorAll('.results-list__item');
    buttonWithText(mario, 'Add to Wishlist').click();
    fixture.detectChanges();

    buttonWithText(zelda, 'Add to My Games').click();
    fixture.detectChanges();

    expect(buttonTexts(mario)).toEqual(['Add to My Games', 'Add to Wishlist']);
    expect(buttonTexts(zelda)).toEqual(['Confirm', 'Cancel']);
  });

  it('opens the new-game form and lists the created game ready to add to the library', () => {
    const fixture = render();
    click(fixture, "Can't find it? Add a new game");
    const addGameForm = fixture.debugElement.query(By.css('app-add-game-form'));

    addGameForm.triggerEventHandler('created', GAME);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-add-game-form')).toBeNull();
    expect(fixture.nativeElement.querySelector('.results-list__item').textContent).toContain(
      'Mario',
    );
    expect(fixture.nativeElement.querySelector('[aria-label="Ownership type"]')).not.toBeNull();
  });

  it('hides the new-game form again when cancelled', () => {
    const fixture = render();
    click(fixture, "Can't find it? Add a new game");

    click(fixture, 'Cancel');

    expect(fixture.nativeElement.querySelector('app-add-game-form')).toBeNull();
  });
});
