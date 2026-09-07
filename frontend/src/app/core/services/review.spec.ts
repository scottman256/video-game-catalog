import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { ReviewService } from './review';

describe('ReviewService', () => {
  let service: ReviewService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ReviewService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('fetches the review for a library entry', () => {
    service.get(1).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/me/library/1/review`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('upserts a review', () => {
    const payload = {
      graphics_performance: 10,
      music_sound: null,
      controls_playability: null,
      content_length: null,
      fun_factor: null,
    };
    service.upsert(1, payload).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/me/library/1/review`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(payload);
    req.flush({});
  });
});
