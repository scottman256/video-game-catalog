import { Component, input, output, signal } from '@angular/core';

@Component({
  selector: 'app-image-carousel',
  imports: [],
  templateUrl: './image-carousel.html',
  styleUrl: './image-carousel.scss',
})
export class ImageCarousel {
  readonly images = input<string[]>([]);
  readonly imageClick = output<string>();

  protected readonly activeIndex = signal(0);

  next(): void {
    const count = this.images().length;
    if (count > 0) this.activeIndex.set((this.activeIndex() + 1) % count);
  }

  previous(): void {
    const count = this.images().length;
    if (count > 0) this.activeIndex.set((this.activeIndex() - 1 + count) % count);
  }

  select(index: number): void {
    this.activeIndex.set(index);
  }
}
