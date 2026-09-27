import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AdminGameSummary, ApprovalStatus } from '../../../core/models/admin.model';
import { AdminService } from '../../../core/services/admin';
import { AdminGameList } from '../admin-game-list/admin-game-list';
import { DeleteGameDialog, DeletableGame } from '../delete-game-dialog/delete-game-dialog';

/** Navigation state key used to announce a game deleted from another screen. */
export const DELETED_GAME_TITLE = 'deletedGameTitle';

@Component({
  selector: 'app-admin-games',
  imports: [AdminGameList, DeleteGameDialog],
  templateUrl: './admin-games.html',
  styleUrl: './admin-games.scss',
})
export class AdminGames {
  private readonly adminService = inject(AdminService);

  protected readonly games = signal<AdminGameSummary[]>([]);
  protected readonly query = signal('');
  protected readonly status = signal<ApprovalStatus>('all');
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly gameToDelete = signal<AdminGameSummary | null>(null);
  protected readonly deletedMessage = signal<string | null>(null);

  constructor() {
    const deletedTitle = inject(Router).currentNavigation()?.extras.state?.[DELETED_GAME_TITLE];
    this.load();
    if (deletedTitle) this.announceDeleted(deletedTitle);
  }

  search(query: string): void {
    this.query.set(query.trim());
    this.load();
  }

  changeStatus(status: ApprovalStatus): void {
    this.status.set(status);
    this.load();
  }

  onGameDeleted(deleted: DeletableGame): void {
    this.gameToDelete.set(null);
    this.games.update((games) => games.filter((game) => game.id !== deleted.id));
    this.announceDeleted(deleted.title);
  }

  private announceDeleted(title: string): void {
    this.deletedMessage.set(`“${title}” was deleted.`);
  }

  private load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.deletedMessage.set(null);
    this.adminService.listGames(this.query(), this.status()).subscribe({
      next: (games) => this.showGames(games),
      error: () => this.failWith('Could not load the catalog. Please try again.'),
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
