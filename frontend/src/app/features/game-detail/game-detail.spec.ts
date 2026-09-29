import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';

import { Game } from '../../core/models/game.model';
import { LibraryEntry } from '../../core/models/library-entry.model';
import { Review } from '../../core/models/review.model';
import { GameService } from '../../core/services/game';
import { LibraryService } from '../../core/services/library';
import { ReviewService } from '../../core/services/review';
import { GameDetail } from './game-detail';

const LIBRARY_ENTRY: LibraryEntry = {
  id: 5,
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
};

const GAME: Game = {
  id: 10,
  title: 'Mario',
  summary: 'A classic platformer',
  release_year: 1985,
  esrb_rating: 'E',
  system: { id: 1, name: 'NES', release_year: 1985 },
  images: [
    { id: 1, kind: 'box_art', url: 'box.png', display_order: 0 },
    { id: 2, kind: 'screenshot', url: 'shot1.png', display_order: 0 },
  ],
  community_average_score: 3.5,
  in_library: true,
  in_wishlist: false,
  is_approved: true,
};

const REVIEW: Review = {
  graphics_performance: 10,
  music_sound: null,
  controls_playability: null,
  content_length: null,
  fun_factor: null,
  weighted_score: 5,
};

describe('GameDetail', () => {
  let libraryGetByIdResult: Observable<LibraryEntry>;
  let game: Game;

  beforeEach(async () => {
    libraryGetByIdResult = of(LIBRARY_ENTRY);
    game = GAME;
    const libraryStub = { getById: () => libraryGetByIdResult };
    const gameStub = { getById: () => of(game) };
    const reviewStub = { get: () => of(REVIEW) };
    const activatedRouteStub = { snapshot: { paramMap: convertToParamMap({ id: '5' }) } };

    await TestBed.configureTestingModule({
      imports: [GameDetail],
      providers: [
        { provide: LibraryService, useValue: libraryStub },
        { provide: GameService, useValue: gameStub },
        { provide: ReviewService, useValue: reviewStub },
        { provide: ActivatedRoute, useValue: activatedRouteStub },
      ],
    }).compileComponents();
  });

  it('loads the library entry, game, and review', () => {
    const fixture = TestBed.createComponent(GameDetail);
    fixture.detectChanges();

    expect(fixture.componentInstance['game']()).toEqual(GAME);
    expect(fixture.componentInstance['review']()).toEqual(REVIEW);
  });

  it('separates box art from screenshots', () => {
    const fixture = TestBed.createComponent(GameDetail);
    fixture.detectChanges();

    expect(fixture.componentInstance['boxArtUrl']()).toBe('box.png');
    expect(fixture.componentInstance['screenshotUrls']()).toEqual(['shot1.png']);
  });

  it('renders the title once loaded', () => {
    const fixture = TestBed.createComponent(GameDetail);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Mario');
  });

  it('shows the pending approval pill under the title for a pending game', () => {
    game = { ...GAME, is_approved: false };
    const fixture = TestBed.createComponent(GameDetail);
    fixture.detectChanges();

    const pill = fixture.nativeElement.querySelector('h1 + app-pending-badge');
    expect(pill.textContent).toContain('Pending Admin Approval');
  });

  it('shows no pending pill for an approved game', () => {
    const fixture = TestBed.createComponent(GameDetail);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-pending-badge')).toBeNull();
  });

  it('shows the ownership form for the library entry', () => {
    const fixture = TestBed.createComponent(GameDetail);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-ownership-form')).not.toBeNull();
  });

  it('keeps the updated library entry after the ownership type is saved', () => {
    const fixture = TestBed.createComponent(GameDetail);
    fixture.detectChanges();

    fixture.componentInstance.onOwnershipSaved({ ...LIBRARY_ENTRY, ownership_type: 'physical' });

    expect(fixture.componentInstance['libraryEntry']()?.ownership_type).toBe('physical');
  });

  it('stops loading and shows an error when the library entry cannot be fetched', () => {
    libraryGetByIdResult = throwError(() => new Error('failed'));
    const fixture = TestBed.createComponent(GameDetail);
    fixture.detectChanges();

    expect(fixture.componentInstance['loading']()).toBe(false);
    expect(fixture.componentInstance['errorMessage']()).toBe('Could not load this game. Please go back and try again.');
  });
});
