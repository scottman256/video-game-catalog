import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
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

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private readonly baseUrl = `${environment.apiBaseUrl}/auth`;
  readonly currentUser = signal<User | null>(null);

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
}
