import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { WishlistService } from './wishlist';

const BASE_URL = `${environment.apiBaseUrl}/me/wishlist`;

describe('WishlistService', () => {
  let service: WishlistService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(WishlistService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists my wishlist', () => {
    service.list().subscribe();

    const req = httpMock.expectOne(BASE_URL);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('adds a game with a target price', () => {
    service.add({ game_id: 1, target_price: '29.99' }).subscribe();

    const req = httpMock.expectOne(BASE_URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ game_id: 1, target_price: '29.99' });
    req.flush({});
  });

  it('updates the target price', () => {
    service.updateTargetPrice(5, null).subscribe();

    const req = httpMock.expectOne(`${BASE_URL}/5`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ target_price: null });
    req.flush({});
  });

  it('removes an entry', () => {
    service.remove(5).subscribe();

    const req = httpMock.expectOne(`${BASE_URL}/5`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('marks an entry as purchased', () => {
    service.markPurchased(5, { ownership_type: 'physical', price_paid: '20.00' }).subscribe();

    const req = httpMock.expectOne(`${BASE_URL}/5/purchase`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ ownership_type: 'physical', price_paid: '20.00' });
    req.flush({});
  });
});
