import { HttpClient } from '@angular/common/http';
import { Injectable, effect, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Settings } from '../models/settings.model';

const THEME_ATTRIBUTE = 'data-theme';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private readonly baseUrl = `${environment.apiBaseUrl}/me/settings`;
  readonly darkMode = signal(false);

  constructor(private readonly http: HttpClient) {
    effect(() => this.applyTheme(this.darkMode()));
  }

  load(): Observable<Settings> {
    return this.http.get<Settings>(this.baseUrl).pipe(tap((settings) => this.darkMode.set(settings.dark_mode)));
  }

  update(darkMode: boolean): Observable<Settings> {
    return this.http
      .put<Settings>(this.baseUrl, { dark_mode: darkMode })
      .pipe(tap((settings) => this.darkMode.set(settings.dark_mode)));
  }

  resetToDefaults(): void {
    this.darkMode.set(false);
  }

  private applyTheme(darkMode: boolean): void {
    document.documentElement.setAttribute(THEME_ATTRIBUTE, darkMode ? 'dark' : 'light');
  }
}
