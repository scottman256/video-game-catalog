import { DatePipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';

import { formatHoursPlayed } from '../../utils/hours';

@Component({
  selector: 'app-play-status',
  imports: [DatePipe],
  templateUrl: './play-status.html',
  styleUrl: './play-status.scss',
})
export class PlayStatus {
  readonly completedOn = input<string | null>(null);
  readonly fullyCompletedOn = input<string | null>(null);
  readonly hoursPlayed = input<string | null>(null);

  protected readonly hoursLabel = computed(() => {
    const hours = this.hoursPlayed();
    return hours === null ? null : formatHoursPlayed(Number(hours));
  });
}
