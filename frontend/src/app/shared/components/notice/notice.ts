import { Component, input, output } from '@angular/core';

/** A dismissible notice. The live region always renders so screen readers announce each new message. */
@Component({
  selector: 'app-notice',
  templateUrl: './notice.html',
  styleUrl: './notice.scss',
})
export class Notice {
  readonly message = input<string | null>(null);
  readonly dismissed = output<void>();
}
