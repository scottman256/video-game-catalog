import { Component, inject, signal } from '@angular/core';

import { AdminGameSummary } from '../../../core/models/admin.model';
import { AdminService } from '../../../core/services/admin';
import { AdminGameList } from '../admin-game-list/admin-game-list';

@Component({
  selector: 'app-approval-queue',
  imports: [AdminGameList],
  templateUrl: './approval-queue.html',
})
export class ApprovalQueue {
  private readonly adminService = inject(AdminService);

  protected readonly games = signal<AdminGameSummary[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  constructor() {
    this.adminService.listPendingGames().subscribe({
      next: (games) => this.showGames(games),
      error: () => this.failWith('Could not load the approval queue. Please try again.'),
    });
  }

  private showGames(games: AdminGameSummary[]): void {
    this.games.set(games);
    this.loading.set(false);
  }

  private failWith(message: string): void {
    this.loading.set(false);
    this.errorMessage.set(message);
  }
}
