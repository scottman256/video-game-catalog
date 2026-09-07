import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';

import { Review } from '../../../core/models/review.model';
import { ReviewService } from '../../../core/services/review';
import { ReviewForm } from './review-form';

describe('ReviewForm', () => {
  let upsertCalls: unknown[];
  let upsertResult: Observable<Review>;

  beforeEach(async () => {
    upsertCalls = [];
    upsertResult = of({
      graphics_performance: 10,
      music_sound: null,
      controls_playability: null,
      content_length: null,
      fun_factor: null,
      weighted_score: 5,
    });
    const reviewStub = {
      upsert: (libraryId: number, payload: unknown) => (upsertCalls.push([libraryId, payload]), upsertResult),
    };

    await TestBed.configureTestingModule({
      imports: [ReviewForm],
      providers: [{ provide: ReviewService, useValue: reviewStub }],
    }).compileComponents();
  });

  it('pre-fills the form from an existing review', () => {
    const fixture = TestBed.createComponent(ReviewForm);
    fixture.componentRef.setInput('libraryId', 1);
    fixture.componentRef.setInput('review', {
      graphics_performance: 8,
      music_sound: null,
      controls_playability: null,
      content_length: null,
      fun_factor: null,
      weighted_score: 4,
    });
    fixture.detectChanges();

    expect(fixture.componentInstance.starsFor('graphics_performance')).toBe(4);
  });

  it('converts stars to half-star units on submit', () => {
    const fixture = TestBed.createComponent(ReviewForm);
    fixture.componentRef.setInput('libraryId', 1);
    fixture.detectChanges();

    fixture.componentInstance.setStars('fun_factor', 4.5);
    fixture.componentInstance.submit();

    expect(upsertCalls[0]).toEqual([
      1,
      {
        graphics_performance: null,
        music_sound: null,
        controls_playability: null,
        content_length: null,
        fun_factor: 9,
      },
    ]);
  });

  it('emits saved with the server response', () => {
    const fixture = TestBed.createComponent(ReviewForm);
    fixture.componentRef.setInput('libraryId', 1);
    fixture.detectChanges();
    let saved: Review | undefined;
    fixture.componentInstance.saved.subscribe((review) => (saved = review));

    fixture.componentInstance.submit();

    expect(saved).toEqual({
      graphics_performance: 10,
      music_sound: null,
      controls_playability: null,
      content_length: null,
      fun_factor: null,
      weighted_score: 5,
    });
  });

  it('resets saving and shows an error when the request fails, so the button is not stuck disabled', () => {
    upsertResult = throwError(() => new Error('failed'));
    const fixture = TestBed.createComponent(ReviewForm);
    fixture.componentRef.setInput('libraryId', 1);
    fixture.detectChanges();

    fixture.componentInstance.submit();

    expect(fixture.componentInstance['saving']()).toBe(false);
    expect(fixture.componentInstance['errorMessage']()).toBe('Could not save your review. Please try again.');
  });

  it('clears a category back to N/A', () => {
    const fixture = TestBed.createComponent(ReviewForm);
    fixture.componentRef.setInput('libraryId', 1);
    fixture.detectChanges();
    fixture.componentInstance.setStars('fun_factor', 3);

    fixture.componentInstance.clear('fun_factor');

    expect(fixture.componentInstance.starsFor('fun_factor')).toBeNull();
  });
});
