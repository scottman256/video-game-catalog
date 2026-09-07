import { Component, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { Review, ReviewUpsertPayload } from '../../../core/models/review.model';
import { ReviewService } from '../../../core/services/review';
import { FieldError } from '../../../shared/components/field-error/field-error';

interface CategoryConfig {
  key: keyof ReviewUpsertPayload;
  label: string;
  weightLabel: string;
}

const CATEGORIES: CategoryConfig[] = [
  { key: 'graphics_performance', label: 'Graphics & Performance', weightLabel: '20%' },
  { key: 'music_sound', label: 'Music & Sound', weightLabel: '15%' },
  { key: 'controls_playability', label: 'Controls & Playability', weightLabel: '20%' },
  { key: 'content_length', label: 'Content & Length', weightLabel: '20%' },
  { key: 'fun_factor', label: 'Fun Factor', weightLabel: '25%' },
];

@Component({
  selector: 'app-review-form',
  imports: [ReactiveFormsModule, FieldError],
  templateUrl: './review-form.html',
  styleUrl: './review-form.scss',
})
export class ReviewForm {
  private readonly reviewService = inject(ReviewService);
  private readonly formBuilder = inject(FormBuilder);

  readonly libraryId = input.required<number>();
  readonly review = input<Review | null>(null);
  readonly saved = output<Review>();

  protected readonly categories = CATEGORIES;
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly form = this.formBuilder.group({
    graphics_performance: [null as number | null],
    music_sound: [null as number | null],
    controls_playability: [null as number | null],
    content_length: [null as number | null],
    fun_factor: [null as number | null],
  });

  constructor() {
    effect(() => {
      const current = this.review();
      if (current) {
        this.form.patchValue({
          graphics_performance: current.graphics_performance,
          music_sound: current.music_sound,
          controls_playability: current.controls_playability,
          content_length: current.content_length,
          fun_factor: current.fun_factor,
        });
      }
    });
  }

  starsFor(key: keyof ReviewUpsertPayload): number | null {
    const value = this.form.controls[key].value;
    return value === null ? null : value / 2;
  }

  setStars(key: keyof ReviewUpsertPayload, stars: number): void {
    this.form.controls[key].setValue(Math.round(stars * 2));
  }

  clear(key: keyof ReviewUpsertPayload): void {
    this.form.controls[key].setValue(null);
  }

  submit(): void {
    this.saving.set(true);
    this.errorMessage.set(null);
    this.reviewService.upsert(this.libraryId(), this.form.getRawValue()).subscribe({
      next: (review) => {
        this.saving.set(false);
        this.saved.emit(review);
      },
      error: () => {
        this.saving.set(false);
        this.errorMessage.set('Could not save your review. Please try again.');
      },
    });
  }
}
