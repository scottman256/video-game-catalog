import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';

import { Review } from '../../../core/models/review.model';
import { ReviewService } from '../../../core/services/review';
import { buttonWithText, enterValue } from '../../../testing/dom';
import { ReviewForm } from './review-form';

const SAVED_REVIEW: Review = {
  graphics_performance: 10,
  music_sound: null,
  controls_playability: null,
  content_length: null,
  fun_factor: null,
  weighted_score: 5,
};

describe('ReviewForm', () => {
  let upsertCalls: unknown[];
  let upsertResult: Observable<Review>;

  beforeEach(async () => {
    upsertCalls = [];
    upsertResult = of(SAVED_REVIEW);
    const reviewStub = {
      upsert: (libraryId: number, payload: unknown) => (
        upsertCalls.push([libraryId, payload]),
        upsertResult
      ),
    };

    await TestBed.configureTestingModule({
      imports: [ReviewForm],
      providers: [{ provide: ReviewService, useValue: reviewStub }],
    }).compileComponents();
  });

  function render(review: Review | null = null): ComponentFixture<ReviewForm> {
    const fixture = TestBed.createComponent(ReviewForm);
    fixture.componentRef.setInput('libraryId', 1);
    fixture.componentRef.setInput('review', review);
    fixture.detectChanges();
    return fixture;
  }

  function row(fixture: ComponentFixture<ReviewForm>, key: string): HTMLElement {
    return fixture.nativeElement.querySelector(`#${key}`).closest('.review-form__row');
  }

  function shownStars(fixture: ComponentFixture<ReviewForm>, key: string): string {
    return row(fixture, key).querySelector('.review-form__value')!.textContent!.trim();
  }

  function rate(fixture: ComponentFixture<ReviewForm>, key: string, stars: string): void {
    enterValue(fixture.nativeElement.querySelector(`#${key}`), stars);
    fixture.detectChanges();
  }

  function save(fixture: ComponentFixture<ReviewForm>): void {
    buttonWithText(fixture.nativeElement, 'Save review').click();
    fixture.detectChanges();
  }

  it('pre-fills the form from an existing review, in stars', () => {
    const fixture = render({ ...SAVED_REVIEW, graphics_performance: 8 });

    expect(shownStars(fixture, 'graphics_performance')).toBe('4');
    expect(fixture.nativeElement.querySelector('#graphics_performance').value).toBe('4');
    expect(shownStars(fixture, 'music_sound')).toBe('N/A');
  });

  it('converts stars to half-star units on submit', () => {
    const fixture = render();
    rate(fixture, 'fun_factor', '4.5');

    save(fixture);

    expect(upsertCalls).toEqual([
      [
        1,
        {
          graphics_performance: null,
          music_sound: null,
          controls_playability: null,
          content_length: null,
          fun_factor: 9,
        },
      ],
    ]);
  });

  it('emits saved with the server response', () => {
    const fixture = render();
    let saved: Review | undefined;
    fixture.componentInstance.saved.subscribe((review) => (saved = review));

    save(fixture);

    expect(saved).toEqual(SAVED_REVIEW);
  });

  it('resets saving and shows an error when the request fails, so the button is not stuck disabled', () => {
    upsertResult = throwError(() => new Error('failed'));
    const fixture = render();

    save(fixture);

    expect(fixture.nativeElement.textContent).toContain(
      'Could not save your review. Please try again.',
    );
    expect(buttonWithText(fixture.nativeElement, 'Save review').disabled).toBe(false);
  });

  it('clears a category back to N/A', () => {
    const fixture = render();
    rate(fixture, 'fun_factor', '3');
    expect(shownStars(fixture, 'fun_factor')).toBe('3');

    buttonWithText(row(fixture, 'fun_factor'), 'Clear').click();
    fixture.detectChanges();

    expect(shownStars(fixture, 'fun_factor')).toBe('N/A');
  });
});
