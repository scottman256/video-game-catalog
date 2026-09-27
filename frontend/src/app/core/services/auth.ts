import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { User } from '../models/user.model';

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  confirm_password: string;
}

export interface LoginPayload {
  identifier: string;
  password: string;
}

export const ADMIN_HOME_URL = '/admin/games';
export const USER_HOME_URL = '/my-games';

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private readonly baseUrl = `${environment.apiBaseUrl}/auth`;
  private readonly impersonationUrl = `${environment.apiBaseUrl}/admin/impersonation`;

  readonly currentUser = signal<User | null>(null);

  /** An admin on their own admin screens, not acting as anyone. */
  readonly isAdminView = computed(() => !!this.currentUser()?.is_admin);
  readonly isImpersonating = computed(() => !!this.currentUser()?.impersonated_by);
  readonly hasAdminAccess = computed(() => this.isAdminView() || this.isImpersonating());
  readonly homeUrl = computed(() => (this.isAdminView() ? ADMIN_HOME_URL : USER_HOME_URL));

  constructor(private readonly http: HttpClient) {}

  register(payload: RegisterPayload): Observable<User> {
    return this.http.post<User>(`${this.baseUrl}/register`, payload).pipe(tap((user) => this.currentUser.set(user)));
  }

  login(payload: LoginPayload): Observable<User> {
    return this.http.post<User>(`${this.baseUrl}/login`, payload).pipe(tap((user) => this.currentUser.set(user)));
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/logout`, {}).pipe(tap(() => this.currentUser.set(null)));
  }

  fetchCurrentUser(): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/me`).pipe(tap((user) => this.currentUser.set(user)));
  }

  refresh(): Observable<User> {
    return this.http.post<User>(`${this.baseUrl}/refresh`, {}).pipe(tap((user) => this.currentUser.set(user)));
  }

  startImpersonation(userId: number): Observable<User> {
    return this.http
      .post<User>(this.impersonationUrl, { user_id: userId })
      .pipe(tap((user) => this.currentUser.set(user)));
  }

  stopImpersonation(): Observable<User> {
    return this.http.delete<User>(this.impersonationUrl).pipe(tap((user) => this.currentUser.set(user)));
  }
}
