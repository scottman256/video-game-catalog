import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { LibraryEntry } from '../models/library-entry.model';
import { WishlistCreatePayload, WishlistEntry, WishlistPurchasePayload } from '../models/wishlist-entry.model';

@Injectable({
  providedIn: 'root',
})
export class WishlistService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/me/wishlist`;

  list(): Observable<WishlistEntry[]> {
    return this.http.get<WishlistEntry[]>(this.baseUrl);
  }

  add(payload: WishlistCreatePayload): Observable<WishlistEntry> {
    return this.http.post<WishlistEntry>(this.baseUrl, payload);
  }

  updateTargetPrice(wishlistId: number, targetPrice: string | null): Observable<WishlistEntry> {
    return this.http.patch<WishlistEntry>(`${this.baseUrl}/${wishlistId}`, { target_price: targetPrice });
  }

  remove(wishlistId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${wishlistId}`);
  }

  markPurchased(wishlistId: number, payload: WishlistPurchasePayload): Observable<LibraryEntry> {
    return this.http.post<LibraryEntry>(`${this.baseUrl}/${wishlistId}/purchase`, payload);
  }
}
