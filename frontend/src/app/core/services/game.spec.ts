import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { GameService } from './game';

describe('GameService', () => {
  let service: GameService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(GameService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('searches games by query', () => {
    service.search('mario').subscribe();

    const req = httpMock.expectOne(
      (r) => r.url === `${environment.apiBaseUrl}/games` && r.params.get('q') === 'mario',
    );
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('fetches a game by id', () => {
    service.getById(1).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/games/1`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('creates a game', () => {
    const payload = { title: 'Mario', summary: null, release_year: 1985, system_id: 1, esrb_rating: 'E' };
    service.create(payload).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/games`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({});
  });

  it('uploads an image as multipart form data', () => {
    const file = new File(['data'], 'cover.png', { type: 'image/png' });
    service.uploadImage(1, 'box_art', file).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/games/1/images`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBe(true);
    req.flush({});
  });
});
