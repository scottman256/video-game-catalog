import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { environment } from '../environments/environment';
import { App } from './app';
import { Auth } from './core/services/auth';
import { ProfileService } from './core/services/profile';
import { SettingsService } from './core/services/settings';

const USER = { id: 1, username: 'scott', email: 'scott@example.com' };
const PROFILE = {
  username: 'scott',
  email: 'scott@example.com',
  created_at: '2026-09-01T00:00:00Z',
  profile_picture_url: null,
  games_owned: 0,
  systems_owned: 0,
  average_review_score: null,
};

describe('App', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  function loginAndFlushSessionRequests(darkMode = false): void {
    TestBed.inject(Auth).currentUser.set(USER);
    TestBed.flushEffects();
    httpMock.expectOne(`${environment.apiBaseUrl}/me/settings`).flush({ dark_mode: darkMode });
    httpMock.expectOne(`${environment.apiBaseUrl}/me/profile`).flush(PROFILE);
  }

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the brand name', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Game Catalog');
  });

  it('loads settings and profile once a user is logged in', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    loginAndFlushSessionRequests(true);

    expect(TestBed.inject(SettingsService).darkMode()).toBe(true);
    expect(TestBed.inject(ProfileService).profile()).toEqual(PROFILE);
  });

  it('resets settings and clears the profile on logout', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    loginAndFlushSessionRequests(true);

    TestBed.inject(Auth).currentUser.set(null);
    TestBed.flushEffects();

    expect(TestBed.inject(SettingsService).darkMode()).toBe(false);
    expect(TestBed.inject(ProfileService).profile()).toBeNull();
  });

  it('opens the settings modal from the user menu', () => {
    const fixture = TestBed.createComponent(App);
    TestBed.inject(Auth).currentUser.set(USER);
    fixture.detectChanges();
    loginAndFlushSessionRequests();
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.user-menu__trigger').click();
    fixture.detectChanges();
    fixture.componentInstance['openSettings']();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.settings-modal')).not.toBeNull();
  });

  it('opens the profile modal from the user menu', () => {
    const fixture = TestBed.createComponent(App);
    TestBed.inject(Auth).currentUser.set(USER);
    fixture.detectChanges();
    loginAndFlushSessionRequests();
    fixture.detectChanges();

    fixture.componentInstance['openProfile']();
    httpMock.expectOne(`${environment.apiBaseUrl}/me/profile`).flush(PROFILE);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.profile-modal')).not.toBeNull();
  });

  it('shows the user menu dropdown only after clicking the trigger', () => {
    const fixture = TestBed.createComponent(App);
    TestBed.inject(Auth).currentUser.set(USER);
    fixture.detectChanges();
    loginAndFlushSessionRequests();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.user-menu__dropdown')).toBeNull();

    fixture.nativeElement.querySelector('.user-menu__trigger').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.user-menu__dropdown')).not.toBeNull();
  });

  it('offers profile, settings and log out in the menu, with log out last', () => {
    const fixture = TestBed.createComponent(App);
    TestBed.inject(Auth).currentUser.set(USER);
    fixture.detectChanges();
    loginAndFlushSessionRequests();
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.user-menu__trigger').click();
    fixture.detectChanges();

    const labels = [...fixture.nativeElement.querySelectorAll('.user-menu__item')].map((item: HTMLElement) =>
      item.textContent.trim(),
    );
    expect(labels).toEqual(['View profile', 'Settings', 'Log out']);
  });

  it('gives every menu item an icon', () => {
    const fixture = TestBed.createComponent(App);
    TestBed.inject(Auth).currentUser.set(USER);
    fixture.detectChanges();
    loginAndFlushSessionRequests();
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.user-menu__trigger').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.user-menu__item .user-menu__icon svg').length).toBe(3);
  });

  it('does not show a log out button outside the menu', () => {
    const fixture = TestBed.createComponent(App);
    TestBed.inject(Auth).currentUser.set(USER);
    fixture.detectChanges();
    loginAndFlushSessionRequests();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.app-header__user > .btn')).toBeNull();
  });

  it('logs out from the menu and returns to the login screen', () => {
    const fixture = TestBed.createComponent(App);
    TestBed.inject(Auth).currentUser.set(USER);
    fixture.detectChanges();
    loginAndFlushSessionRequests();
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    const navigated: string[] = [];
    router.navigateByUrl = ((url: string) => {
      navigated.push(url);
      return Promise.resolve(true);
    }) as typeof router.navigateByUrl;
    fixture.nativeElement.querySelector('.user-menu__trigger').click();
    fixture.detectChanges();

    [...fixture.nativeElement.querySelectorAll('.user-menu__item')]
      .find((item: HTMLElement) => item.textContent.includes('Log out'))
      .click();
    httpMock.expectOne(`${environment.apiBaseUrl}/auth/logout`).flush(null);
    fixture.detectChanges();

    expect(navigated).toEqual(['/login']);
    expect(fixture.nativeElement.querySelector('.user-menu__dropdown')).toBeNull();
  });

  it('closes the dropdown when the backdrop is clicked', () => {
    const fixture = TestBed.createComponent(App);
    TestBed.inject(Auth).currentUser.set(USER);
    fixture.detectChanges();
    loginAndFlushSessionRequests();
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.user-menu__trigger').click();
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.user-menu__backdrop').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.user-menu__dropdown')).toBeNull();
  });
});
