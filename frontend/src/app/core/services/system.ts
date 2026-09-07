import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { GameSystem } from '../models/system.model';

@Injectable({
  providedIn: 'root',
})
export class SystemService {
  private readonly baseUrl = `${environment.apiBaseUrl}/systems`;

  constructor(private readonly http: HttpClient) {}

  list(): Observable<GameSystem[]> {
    return this.http.get<GameSystem[]>(this.baseUrl);
  }
}
