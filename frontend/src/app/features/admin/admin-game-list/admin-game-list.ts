import { DatePipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AdminGameSummary } from '../../../core/models/admin.model';
import { PendingBadge } from '../../../shared/components/pending-badge/pending-badge';

@Component({
  selector: 'app-admin-game-list',
  imports: [DatePipe, RouterLink, PendingBadge],
  templateUrl: './admin-game-list.html',
  styleUrl: './admin-game-list.scss',
})
export class AdminGameList {
  readonly games = input.required<AdminGameSummary[]>();
  readonly actionLabel = input('Edit');
  readonly showDelete = input(false);
  readonly deleteRequested = output<AdminGameSummary>();
}
