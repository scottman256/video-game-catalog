import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NEVER, Observable, of, throwError } from 'rxjs';

import { WishlistEntry } from '../../core/models/wishlist-entry.model';
import { WishlistService } from '../../core/services/wishlist';
import { buttonTexts, buttonWithText, enterValue } from '../../testing/dom';
import { Wishlist } from './wishlist';

const ENTRY: WishlistEntry = {
  id: 1,
  game: {
    id: 10,
    title: 'Mario',
    release_year: 1985,
    system: { id: 1, name: 'NES', release_year: 1985 },
    box_art_url: null,
    is_approved: true,
  },
  target_price: '24.99',
  added_at: '2026-01-01T00:00:00Z',
};

describe('Wishlist', () => {
  let listResult: Observable<WishlistEntry[]>;
  let actionResult: Observable<unknown>;
  let purchaseCalls: unknown[];
  let updateCalls: unknown[];
  let removeCalls: number[];

  beforeEach(async () => {
    listResult = of([ENTRY]);
    actionResult = of({});
    purchaseCalls = [];
    updateCalls = [];
    removeCalls = [];
    const wishlistStub = {
      list: () => listResult,
      markPurchased: (id: number, payload: unknown) => (
        purchaseCalls.push([id, payload]),
        actionResult
      ),
      updateTargetPrice: (id: number, price: string | null) => (
        updateCalls.push([id, price]),
        actionResult
      ),
      remove: (id: number) => (removeCalls.push(id), actionResult),
    };

    await TestBed.configureTestingModule({
      imports: [Wishlist],
      providers: [provideRouter([]), { provide: WishlistService, useValue: wishlistStub }],
    }).compileComponents();
  });

  function render(...entries: WishlistEntry[]): ComponentFixture<Wishlist> {
    if (entries.length) listResult = of(entries);
    const fixture = TestBed.createComponent(Wishlist);
    fixture.detectChanges();
    return fixture;
  }

  function click(fixture: ComponentFixture<Wishlist>, label: string): void {
    buttonWithText(fixture.nativeElement, label).click();
    fixture.detectChanges();
  }

  function field<T extends HTMLElement>(fixture: ComponentFixture<Wishlist>, ariaLabel: string): T {
    return fixture.nativeElement.querySelector(`[aria-label="${ariaLabel}"]`);
  }

  function text(fixture: ComponentFixture<Wishlist>): string {
    return fixture.nativeElement.textContent;
  }

  it('renders entries with their target price and a count', () => {
    const fixture = render();

    expect(text(fixture)).toContain('Mario');
    expect(text(fixture)).toContain('1985 · NES');
    expect(text(fixture)).toContain('$24.99');
    expect(text(fixture)).toContain('1 game');
  });

  it('pluralizes the count and shows box art and pending badges', () => {
    const pendingWithArt = {
      ...ENTRY,
      id: 2,
      game: { ...ENTRY.game, box_art_url: '/cover.png', is_approved: false },
    };

    const fixture = render(ENTRY, pendingWithArt);

    expect(text(fixture)).toContain('2 games');
    expect(fixture.nativeElement.querySelector('img').getAttribute('src')).toBe('/cover.png');
    expect(fixture.nativeElement.querySelectorAll('app-pending-badge').length).toBe(1);
  });

  it('invites setting a target price when there is none, starting from a blank price', () => {
    const fixture = render({ ...ENTRY, target_price: null });
    expect(text(fixture)).toContain('No target price');

    click(fixture, 'Set one');

    expect(field<HTMLInputElement>(fixture, 'Target price').value).toBe('');
  });

  it('shows a loading message until the wishlist arrives', () => {
    listResult = NEVER;

    expect(text(render())).toContain('Loading…');
  });

  it('shows an empty state when the wishlist is empty', () => {
    listResult = of([]);

    expect(text(render())).toContain('Your wishlist is empty.');
  });

  it('shows an error when loading fails', () => {
    listResult = throwError(() => new Error('failed'));

    expect(text(render())).toContain('Could not load your wishlist.');
  });

  it('prefills the price paid with the target price when starting a purchase', () => {
    const fixture = render();

    click(fixture, 'I bought it');

    expect(field<HTMLInputElement>(fixture, 'Price paid').value).toBe('24.99');
  });

  it('moves a purchased game out of the wishlist and confirms it', () => {
    const fixture = render();
    click(fixture, 'I bought it');
    enterValue(field(fixture, 'Ownership type'), 'physical');
    enterValue(field(fixture, 'Price paid'), '20.00');

    click(fixture, 'Add to My Games');

    expect(purchaseCalls).toEqual([[1, { ownership_type: 'physical', price_paid: '20.00' }]]);
    expect(text(fixture)).toContain('Your wishlist is empty.');
    expect(text(fixture)).toContain('Mario moved to My Games.');
  });

  it('sends a null price when the price paid is left blank', () => {
    const fixture = render({ ...ENTRY, target_price: null });
    click(fixture, 'I bought it');

    click(fixture, 'Add to My Games');

    expect(purchaseCalls).toEqual([[1, { ownership_type: 'digital', price_paid: null }]]);
  });

  it('closes the purchase form when cancelled', () => {
    const fixture = render();
    click(fixture, 'I bought it');

    click(fixture, 'Cancel');

    expect(purchaseCalls).toEqual([]);
    expect(buttonTexts(fixture.nativeElement, '.wishlist-item__actions button')).toEqual([
      'I bought it',
      'Remove',
    ]);
  });

  it('keeps the entry and shows the server message when a purchase fails', () => {
    actionResult = throwError(() => ({ error: { detail: 'Game is already in your library' } }));
    const fixture = render();
    click(fixture, 'I bought it');

    click(fixture, 'Add to My Games');

    expect(text(fixture)).toContain('Game is already in your library');
    expect(fixture.nativeElement.querySelectorAll('.wishlist-item').length).toBe(1);
  });

  it('saves an edited target price', () => {
    actionResult = of({ ...ENTRY, target_price: '19.99' });
    const fixture = render();
    click(fixture, 'Edit');
    expect(field<HTMLInputElement>(fixture, 'Target price').value).toBe('24.99');
    enterValue(field(fixture, 'Target price'), '19.99');

    click(fixture, 'Save');

    expect(updateCalls).toEqual([[1, '19.99']]);
    expect(text(fixture)).toContain('$19.99');
    expect(field(fixture, 'Target price')).toBeNull();
  });

  it('clears the target price when saved blank', () => {
    actionResult = of({ ...ENTRY, target_price: null });
    const fixture = render();
    click(fixture, 'Edit');
    enterValue(field(fixture, 'Target price'), '');

    click(fixture, 'Save');

    expect(updateCalls).toEqual([[1, null]]);
    expect(text(fixture)).toContain('No target price');
  });

  it('only updates the edited entry', () => {
    const other = {
      ...ENTRY,
      id: 2,
      game: { ...ENTRY.game, id: 20, title: 'Zelda' },
      target_price: '5.00',
    };
    actionResult = of({ ...ENTRY, target_price: '19.99' });
    const fixture = render(ENTRY, other);
    buttonWithText(fixture.nativeElement.querySelector('.wishlist-item'), 'Edit').click();
    fixture.detectChanges();

    click(fixture, 'Save');

    expect(text(fixture)).toContain('$19.99');
    expect(text(fixture)).toContain('$5.00');
  });

  it('closes the target price editor when cancelled', () => {
    const fixture = render();
    click(fixture, 'Edit');

    click(fixture, 'Cancel');

    expect(updateCalls).toEqual([]);
    expect(field(fixture, 'Target price')).toBeNull();
  });

  it('shows a fallback message when updating the target price fails', () => {
    actionResult = throwError(() => new Error('failed'));
    const fixture = render();
    click(fixture, 'Edit');

    click(fixture, 'Save');

    expect(text(fixture)).toContain('Could not update the target price.');
  });

  it('removes an entry and confirms it in a dismissible notice', () => {
    const fixture = render();

    click(fixture, 'Remove');

    expect(removeCalls).toEqual([1]);
    expect(text(fixture)).toContain('Mario removed from your wishlist.');
    fixture.nativeElement.querySelector('.notice__dismiss').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.notice')).toBeNull();
  });

  it('shows a fallback message when removing fails', () => {
    actionResult = throwError(() => new Error('failed'));
    const fixture = render();

    click(fixture, 'Remove');

    expect(text(fixture)).toContain('Could not remove this game.');
  });
});
