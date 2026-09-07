import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Profile } from '../models/profile.model';

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  private readonly baseUrl = `${environment.apiBaseUrl}/me/profile`;
  readonly profile = signal<Profile | null>(null);

  constructor(private readonly http: HttpClient) {}

  load(): Observable<Profile> {
    return this.http.get<Profile>(this.baseUrl).pipe(tap((profile) => this.profile.set(profile)));
  }

  uploadPicture(file: File): Observable<Profile> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http
      .post<Profile>(`${this.baseUrl}/picture`, formData)
      .pipe(tap((profile) => this.profile.set(profile)));
  }

  clear(): void {
    this.profile.set(null);
  }
}
