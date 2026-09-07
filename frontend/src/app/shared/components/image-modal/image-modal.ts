import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-image-modal',
  imports: [],
  templateUrl: './image-modal.html',
  styleUrl: './image-modal.scss',
})
export class ImageModal {
  readonly imageUrl = input<string | null>(null);
  readonly closed = output<void>();
}
