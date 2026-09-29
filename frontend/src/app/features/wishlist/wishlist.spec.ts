import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';

import { WishlistEntry } from '../../core/models/wishlist-entry.model';
import { WishlistService } from '../../core/services/wishlist';
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
      markPurchased: (id: number, payload: unknown) => (purchaseCalls.push([id, payload]), actionResult),
      updateTargetPrice: (id: number, price: string | null) => (updateCalls.push([id, price]), actionResult),
      remove: (id: number) => (removeCalls.push(id), actionResult),
    };

    await TestBed.configureTestingModule({
      imports: [Wishlist],
      providers: [provideRouter([]), { provide: WishlistService, useValue: wishlistStub }],
    }).compileComponents();
  });

  function render() {
    const fixture = TestBed.createComponent(Wishlist);
    fixture.detectChanges();
    return fixture;
  }

  it('renders entries with their target price and a count', () => {
    const text = render().nativeElement.textContent;

    expect(text).toContain('Mario');
    expect(text).toContain('$24.99');
    expect(text).toContain('1 game');
  });

  it('shows an empty state when the wishlist is empty', () => {
    listResult = of([]);

    expect(render().nativeElement.textContent).toContain('Your wishlist is empty.');
  });

  it('shows an error when loading fails', () => {
    listResult = throwError(() => new Error('failed'));

    expect(render().nativeElement.textContent).toContain('Could not load your wishlist.');
  });

  it('prefills the price paid with the target price when starting a purchase', () => {
    const fixture = render();

    fixture.componentInstance.startPurchase(ENTRY);

    expect(fixture.componentInstance['purchasePrice']()).toBe('24.99');
    expect(fixture.componentInstance['purchasingId']()).toBe(1);
  });

  it('moves a purchased game out of the wishlist and confirms it', () => {
    const fixture = render();
    fixture.componentInstance.startPurchase(ENTRY);
    fixture.componentInstance['purchaseOwnership'].set('physical');

    fixture.componentInstance.confirmPurchase(ENTRY);
    fixture.detectChanges();

    expect(purchaseCalls).toEqual([[1, { ownership_type: 'physical', price_paid: '24.99' }]]);
    expect(fixture.componentInstance['entries']()).toEqual([]);
    expect(fixture.componentInstance['notice']()).toBe('Mario moved to My Games.');
  });

  it('sends a null price when the price paid is left blank', () => {
    const fixture = render();
    fixture.componentInstance.startPurchase({ ...ENTRY, target_price: null });

    fixture.componentInstance.confirmPurchase(ENTRY);

    expect(purchaseCalls).toEqual([[1, { ownership_type: 'digital', price_paid: null }]]);
  });

  it('keeps the entry and shows the server message when a purchase fails', () => {
    actionResult = throwError(() => ({ error: { detail: 'Game is already in your library' } }));
    const fixture = render();

    fixture.componentInstance.confirmPurchase(ENTRY);

    expect(fixture.componentInstance['entries']().length).toBe(1);
    expect(fixture.componentInstance['actionError']()).toBe('Game is already in your library');
  });

  it('saves an edited target price', () => {
    actionResult = of({ ...ENTRY, target_price: '19.99' });
    const fixture = render();
    fixture.componentInstance.startEditingPrice(ENTRY);
    fixture.componentInstance['editedTargetPrice'].set('19.99');

    fixture.componentInstance.saveTargetPrice(ENTRY);

    expect(updateCalls).toEqual([[1, '19.99']]);
    expect(fixture.componentInstance['entries']()[0].target_price).toBe('19.99');
    expect(fixture.componentInstance['editingPriceId']()).toBeNull();
  });

  it('removes an entry', () => {
    const fixture = render();

    fixture.componentInstance.remove(ENTRY);

    expect(removeCalls).toEqual([1]);
    expect(fixture.componentInstance['entries']()).toEqual([]);
    expect(fixture.componentInstance['notice']()).toBe('Mario removed from your wishlist.');
  });
});
