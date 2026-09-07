import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Game, GameCreatePayload, ImageKind } from '../models/game.model';

@Injectable({
  providedIn: 'root',
})
export class GameService {
  private readonly baseUrl = `${environment.apiBaseUrl}/games`;

  constructor(private readonly http: HttpClient) {}

  search(query: string): Observable<Game[]> {
    return this.http.get<Game[]>(this.baseUrl, { params: { q: query } });
  }

  getById(gameId: number): Observable<Game> {
    return this.http.get<Game>(`${this.baseUrl}/${gameId}`);
  }

  create(payload: GameCreatePayload): Observable<Game> {
    return this.http.post<Game>(this.baseUrl, payload);
  }

  uploadImage(gameId: number, kind: ImageKind, file: File): Observable<unknown> {
    const formData = new FormData();
    formData.append('kind', kind);
    formData.append('file', file);
    return this.http.post(`${this.baseUrl}/${gameId}/images`, formData);
  }
}
