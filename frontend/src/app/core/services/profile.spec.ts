import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { Profile } from '../models/profile.model';
import { ProfileService } from './profile';

const PROFILE: Profile = {
  username: 'scott',
  email: 'scott@example.com',
  created_at: '2026-09-01T00:00:00Z',
  profile_picture_url: null,
  games_owned: 3,
  systems_owned: 2,
  average_review_score: 4.5,
};

describe('ProfileService', () => {
  let service: ProfileService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProfileService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('loads the profile and exposes it as a signal', () => {
    service.load().subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/me/profile`);
    expect(req.request.method).toBe('GET');
    req.flush(PROFILE);

    expect(service.profile()).toEqual(PROFILE);
  });

  it('uploads a picture as multipart form data and stores the updated profile', () => {
    const file = new File(['data'], 'avatar.png', { type: 'image/png' });

    service.uploadPicture(file).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/me/profile/picture`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBe(true);
    req.flush({ ...PROFILE, profile_picture_url: 'http://localhost:8000/uploads/profile_pictures/a.png' });

    expect(service.profile()?.profile_picture_url).toContain('profile_pictures');
  });

  it('clears the cached profile on logout', () => {
    service.profile.set(PROFILE);

    service.clear();

    expect(service.profile()).toBeNull();
  });
});
