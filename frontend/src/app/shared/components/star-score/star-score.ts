import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-star-score',
  imports: [],
  templateUrl: './star-score.html',
  styleUrl: './star-score.scss',
})
export class StarScore {
  readonly score = input<number | null>(null);

  protected readonly starPercents = computed(() => {
    const value = this.score();
    if (value === null) {
      return null;
    }
    return Array.from({ length: 5 }, (_, index) => Math.max(0, Math.min(1, value - index)) * 100);
  });
}
