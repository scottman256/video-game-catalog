import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { SettingsService } from './settings';

describe('SettingsService', () => {
  let service: SettingsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SettingsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('loads settings and updates the darkMode signal', () => {
    service.load().subscribe();

    httpMock.expectOne(`${environment.apiBaseUrl}/me/settings`).flush({ dark_mode: true });

    expect(service.darkMode()).toBe(true);
  });

  it('sends an update request and applies the response', () => {
    service.update(true).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/me/settings`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ dark_mode: true });
    req.flush({ dark_mode: true });

    expect(service.darkMode()).toBe(true);
  });

  it('resets to defaults', () => {
    service.darkMode.set(true);

    service.resetToDefaults();

    expect(service.darkMode()).toBe(false);
  });

  it('applies the dark-mode attribute to the document element', () => {
    service.darkMode.set(true);
    TestBed.flushEffects();

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('switches the attribute back to light when dark mode is turned off', () => {
    service.darkMode.set(true);
    TestBed.flushEffects();

    service.darkMode.set(false);
    TestBed.flushEffects();

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
