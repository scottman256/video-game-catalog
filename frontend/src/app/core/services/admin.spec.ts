import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { GameUpdatePayload } from '../models/admin.model';
import { AdminService } from './admin';

const CHANGES: GameUpdatePayload = {
  title: 'Mario',
  summary: null,
  release_year: 1985,
  system_id: 1,
  esrb_rating: 'E',
};

describe('AdminService', () => {
  const adminUrl = `${environment.apiBaseUrl}/admin`;
  let service: AdminService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdminService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists games filtered by title and approval status', () => {
    service.listGames('mario', 'pending').subscribe();

    const request = httpMock.expectOne((req) => req.url === `${adminUrl}/games`);
    expect(request.request.params.get('q')).toBe('mario');
    expect(request.request.params.get('status')).toBe('pending');
    request.flush([]);
  });

  it('tracks how many games are waiting when the queue loads', () => {
    service.listPendingGames().subscribe();

    httpMock.expectOne(`${adminUrl}/games/pending`).flush([{ id: 1 }, { id: 2 }]);

    expect(service.pendingCount()).toBe(2);
  });

  it('saves edits with PATCH', () => {
    service.updateGame(5, CHANGES).subscribe();

    const request = httpMock.expectOne(`${adminUrl}/games/5`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual(CHANGES);
    request.flush({});
  });

  it('sends the current edits when approving and lowers the pending count', () => {
    service.pendingCount.set(3);

    service.approveGame(5, CHANGES).subscribe();
    const request = httpMock.expectOne(`${adminUrl}/games/5/approve`);
    request.flush({});

    expect(request.request.body).toEqual(CHANGES);
    expect(service.pendingCount()).toBe(2);
  });

  it('deletes a game and lowers the pending count when it was pending', () => {
    service.pendingCount.set(2);

    service.deleteGame({ id: 5, is_approved: false }).subscribe();
    const request = httpMock.expectOne(`${adminUrl}/games/5`);
    request.flush(null);

    expect(request.request.method).toBe('DELETE');
    expect(service.pendingCount()).toBe(1);
  });

  it('leaves the pending count alone when deleting an approved game', () => {
    service.pendingCount.set(2);

    service.deleteGame({ id: 5, is_approved: true }).subscribe();
    httpMock.expectOne(`${adminUrl}/games/5`).flush(null);

    expect(service.pendingCount()).toBe(2);
  });

  it('uploads an image as multipart form data', () => {
    const file = new File(['x'], 'cover.png', { type: 'image/png' });

    service.uploadImage(5, 'box_art', file).subscribe();

    const request = httpMock.expectOne(`${adminUrl}/games/5/images`);
    expect((request.request.body as FormData).get('kind')).toBe('box_art');
    request.flush({});
  });

  it('deletes an image', () => {
    service.deleteImage(5, 9).subscribe();

    const request = httpMock.expectOne(`${adminUrl}/games/5/images/9`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
  });

  it('lists the users an admin can act as', () => {
    service.listUsers().subscribe();

    httpMock.expectOne(`${adminUrl}/users`).flush([]);
  });
});
