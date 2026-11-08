import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { NEVER, Observable, of, throwError } from 'rxjs';

import { Game } from '../../core/models/game.model';
import { LibraryEntry } from '../../core/models/library-entry.model';
import { Review } from '../../core/models/review.model';
import { GameService } from '../../core/services/game';
import { LibraryService } from '../../core/services/library';
import { ReviewService } from '../../core/services/review';
import { ImageCarousel } from '../../shared/components/image-carousel/image-carousel';
import { ImageModal } from '../../shared/components/image-modal/image-modal';
import { StarScore } from '../../shared/components/star-score/star-score';
import { GameDetail } from './game-detail';
import { PlayProgressForm } from './play-progress-form/play-progress-form';
import { ReviewForm } from './review-form/review-form';

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
  completed_on: null,
  fully_completed_on: null,
  hours_played: null,
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
  let gameResult: Observable<Game>;

  beforeEach(async () => {
    libraryGetByIdResult = of(LIBRARY_ENTRY);
    gameResult = of(GAME);
    const libraryStub = { getById: () => libraryGetByIdResult };
    const gameStub = { getById: () => gameResult };
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

  function render(game: Game = GAME): ComponentFixture<GameDetail> {
    gameResult = of(game);
    const fixture = TestBed.createComponent(GameDetail);
    fixture.detectChanges();
    return fixture;
  }

  function child<T>(fixture: ComponentFixture<GameDetail>, type: new (...args: never[]) => T): T {
    return fixture.debugElement.query(By.directive(type)).componentInstance;
  }

  function emitFrom(
    fixture: ComponentFixture<GameDetail>,
    selector: string,
    eventName: string,
    value?: unknown,
  ): void {
    fixture.debugElement.query(By.css(selector)).triggerEventHandler(eventName, value);
    fixture.detectChanges();
  }

  it('renders the game details once loaded', () => {
    const text = render().nativeElement.textContent;

    expect(text).toContain('Mario');
    expect(text).toContain('1985 · NES · ESRB E');
    expect(text).toContain('A classic platformer');
  });

  it('shows the box art separately from the screenshot carousel', () => {
    const fixture = render();

    expect(fixture.nativeElement.querySelector('.game-detail__box-art').getAttribute('src')).toBe(
      'box.png',
    );
    expect(child(fixture, ImageCarousel).images()).toEqual(['shot1.png']);
  });

  it('leaves out the box art and summary when the game has neither', () => {
    const fixture = render({ ...GAME, summary: null, images: [] });

    expect(fixture.nativeElement.querySelector('.game-detail__box-art')).toBeNull();
    expect(fixture.nativeElement.querySelector('.game-detail__summary')).toBeNull();
  });

  it('shows your score and the community average', () => {
    const scores = render()
      .debugElement.queryAll(By.directive(StarScore))
      .map((score) => score.componentInstance.score());

    expect(scores).toEqual([5, 3.5]);
  });

  it('shows the pending approval pill under the title for a pending game', () => {
    const fixture = render({ ...GAME, is_approved: false });

    const pill = fixture.nativeElement.querySelector('h1 + app-pending-badge');
    expect(pill.textContent).toContain('Pending Admin Approval');
  });

  it('shows no pending pill for an approved game', () => {
    expect(render().nativeElement.querySelector('app-pending-badge')).toBeNull();
  });

  it('shows the ownership, play progress, and review forms for the library entry', () => {
    const fixture = render();

    expect(fixture.nativeElement.querySelector('app-ownership-form')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-play-progress-form')).not.toBeNull();
    expect(child(fixture, ReviewForm).review()).toEqual(REVIEW);
  });

  it('passes the updated entry to the other forms after ownership is saved', () => {
    const fixture = render();
    const updated = { ...LIBRARY_ENTRY, ownership_type: 'physical' as const };

    emitFrom(fixture, 'app-ownership-form', 'saved', updated);

    expect(child(fixture, PlayProgressForm).entry()).toEqual(updated);
  });

  it('keeps the updated entry after play progress is saved', () => {
    const fixture = render();
    const updated = { ...LIBRARY_ENTRY, hours_played: '12.0' };

    emitFrom(fixture, 'app-play-progress-form', 'saved', updated);

    expect(child(fixture, PlayProgressForm).entry()).toEqual(updated);
  });

  it('updates your score after the review is saved', () => {
    const fixture = render();

    emitFrom(fixture, 'app-review-form', 'saved', { ...REVIEW, weighted_score: 2.5 });

    expect(fixture.debugElement.query(By.directive(StarScore)).componentInstance.score()).toBe(2.5);
  });

  it('opens a clicked screenshot full size and closes it again', () => {
    const fixture = render();

    emitFrom(fixture, 'app-image-carousel', 'imageClick', 'shot1.png');
    expect(child(fixture, ImageModal).imageUrl()).toBe('shot1.png');

    emitFrom(fixture, 'app-image-modal', 'closed');
    expect(child(fixture, ImageModal).imageUrl()).toBeNull();
  });

  it('shows a loading message until the game arrives', () => {
    gameResult = NEVER;
    const fixture = TestBed.createComponent(GameDetail);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Loading…');
  });

  it('stops loading and shows an error when the library entry cannot be fetched', () => {
    libraryGetByIdResult = throwError(() => new Error('failed'));

    const text = render().nativeElement.textContent;

    expect(text).toContain('Could not load this game. Please go back and try again.');
    expect(text).not.toContain('Loading…');
  });

  it('shows an error when the game or review cannot be fetched', () => {
    gameResult = throwError(() => new Error('failed'));
    const fixture = TestBed.createComponent(GameDetail);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Could not load this game. Please go back and try again.',
    );
  });
});
