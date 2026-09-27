import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AdminGame, AdminGameSummary, AdminUser, ApprovalStatus, GameUpdatePayload } from '../models/admin.model';
import { GameImage, ImageKind } from '../models/game.model';

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private readonly baseUrl = `${environment.apiBaseUrl}/admin`;

  /** Shown on the Approval Queue nav link; kept current whenever the queue is loaded or a game is approved. */
  readonly pendingCount = signal(0);

  constructor(private readonly http: HttpClient) {}

  listGames(query: string, status: ApprovalStatus): Observable<AdminGameSummary[]> {
    return this.http.get<AdminGameSummary[]>(`${this.baseUrl}/games`, { params: { q: query, status } });
  }

  listPendingGames(): Observable<AdminGameSummary[]> {
    return this.http
      .get<AdminGameSummary[]>(`${this.baseUrl}/games/pending`)
      .pipe(tap((games) => this.pendingCount.set(games.length)));
  }

  getGame(gameId: number): Observable<AdminGame> {
    return this.http.get<AdminGame>(`${this.baseUrl}/games/${gameId}`);
  }

  updateGame(gameId: number, changes: GameUpdatePayload): Observable<AdminGame> {
    return this.http.patch<AdminGame>(`${this.baseUrl}/games/${gameId}`, changes);
  }

  approveGame(gameId: number, changes: GameUpdatePayload): Observable<AdminGame> {
    return this.http
      .post<AdminGame>(`${this.baseUrl}/games/${gameId}/approve`, changes)
      .pipe(tap(() => this.decrementPendingCount()));
  }

  /** Permanently removes the game, its images, and every player's library entry and review for it. */
  deleteGame(game: Pick<AdminGameSummary, 'id' | 'is_approved'>): Observable<void> {
    return this.http
      .delete<void>(`${this.baseUrl}/games/${game.id}`)
      .pipe(
        tap(() => {
          if (!game.is_approved) this.decrementPendingCount();
        }),
      );
  }

  uploadImage(gameId: number, kind: ImageKind, file: File): Observable<GameImage> {
    const formData = new FormData();
    formData.append('kind', kind);
    formData.append('file', file);
    return this.http.post<GameImage>(`${this.baseUrl}/games/${gameId}/images`, formData);
  }

  deleteImage(gameId: number, imageId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/games/${gameId}/images/${imageId}`);
  }

  listUsers(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(`${this.baseUrl}/users`);
  }

  private decrementPendingCount(): void {
    this.pendingCount.update((count) => Math.max(count - 1, 0));
  }
}
