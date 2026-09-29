import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { LibraryService } from './library';

describe('LibraryService', () => {
  let service: LibraryService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(LibraryService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists my library with sort and direction params', () => {
    service.list('title', 'asc').subscribe();

    const req = httpMock.expectOne(
      (r) => r.url === `${environment.apiBaseUrl}/me/library` && r.params.get('sort') === 'title',
    );
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('adds a game to my library', () => {
    const payload = { game_id: 1, ownership_type: 'digital' as const, price_paid: '19.99' };
    service.add(payload).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/me/library`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({});
  });

  it('updates a library entry', () => {
    service.update(1, 'physical', '9.99').subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/me/library/1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ ownership_type: 'physical', price_paid: '9.99' });
    req.flush({});
  });

  it('saves play progress for a library entry', () => {
    const payload = { completed_on: '2026-09-01', fully_completed_on: null, hours_played: '12.5' };
    service.updatePlayProgress(1, payload).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/me/library/1/progress`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(payload);
    req.flush({});
  });

  it('removes a library entry', () => {
    service.remove(1).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/me/library/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
