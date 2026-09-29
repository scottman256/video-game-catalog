import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  LibraryCreatePayload,
  LibraryEntry,
  LibrarySortField,
  OwnershipType,
  PlayProgressPayload,
  SortDirection,
} from '../models/library-entry.model';

@Injectable({
  providedIn: 'root',
})
export class LibraryService {
  private readonly baseUrl = `${environment.apiBaseUrl}/me/library`;

  constructor(private readonly http: HttpClient) {}

  list(sort: LibrarySortField, direction: SortDirection): Observable<LibraryEntry[]> {
    return this.http.get<LibraryEntry[]>(this.baseUrl, { params: { sort, direction } });
  }

  getById(libraryId: number): Observable<LibraryEntry> {
    return this.http.get<LibraryEntry>(`${this.baseUrl}/${libraryId}`);
  }

  add(payload: LibraryCreatePayload): Observable<LibraryEntry> {
    return this.http.post<LibraryEntry>(this.baseUrl, payload);
  }

  update(libraryId: number, ownershipType: OwnershipType, pricePaid: string | null): Observable<LibraryEntry> {
    return this.http.patch<LibraryEntry>(`${this.baseUrl}/${libraryId}`, {
      ownership_type: ownershipType,
      price_paid: pricePaid,
    });
  }

  updatePlayProgress(libraryId: number, payload: PlayProgressPayload): Observable<LibraryEntry> {
    return this.http.put<LibraryEntry>(`${this.baseUrl}/${libraryId}/progress`, payload);
  }

  remove(libraryId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${libraryId}`);
  }
}
