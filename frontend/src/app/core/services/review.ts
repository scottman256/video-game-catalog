import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Review, ReviewUpsertPayload } from '../models/review.model';

@Injectable({
  providedIn: 'root',
})
export class ReviewService {
  constructor(private readonly http: HttpClient) {}

  get(libraryId: number): Observable<Review> {
    return this.http.get<Review>(this.reviewUrl(libraryId));
  }

  upsert(libraryId: number, payload: ReviewUpsertPayload): Observable<Review> {
    return this.http.put<Review>(this.reviewUrl(libraryId), payload);
  }

  private reviewUrl(libraryId: number): string {
    return `${environment.apiBaseUrl}/me/library/${libraryId}/review`;
  }
}
