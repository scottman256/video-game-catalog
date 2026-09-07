import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';

import { Settings } from '../../../core/models/settings.model';
import { SettingsService } from '../../../core/services/settings';
import { SettingsModal } from './settings-modal';

describe('SettingsModal', () => {
  let updateCalls: unknown[];
  let updateResult: Observable<Settings>;
  let darkModeSignal: ReturnType<typeof signal<boolean>>;

  beforeEach(async () => {
    updateCalls = [];
    updateResult = of({ dark_mode: true });
    darkModeSignal = signal(false);
    const settingsStub = {
      darkMode: darkModeSignal,
      update: (darkMode: boolean) => {
        updateCalls.push(darkMode);
        return updateResult;
      },
    };

    await TestBed.configureTestingModule({
      imports: [SettingsModal],
      providers: [{ provide: SettingsService, useValue: settingsStub }],
    }).compileComponents();
  });

  it('renders nothing when closed', () => {
    const fixture = TestBed.createComponent(SettingsModal);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.settings-modal')).toBeNull();
  });

  it('renders the dark mode toggle when open', () => {
    const fixture = TestBed.createComponent(SettingsModal);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#dark-mode-toggle')).not.toBeNull();
  });

  it('emits closed when the close button is clicked', () => {
    const fixture = TestBed.createComponent(SettingsModal);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    let closed = false;
    fixture.componentInstance.closed.subscribe(() => (closed = true));

    fixture.nativeElement.querySelector('.settings-modal__close').click();

    expect(closed).toBe(true);
  });

  it('optimistically flips dark mode and persists it', () => {
    const fixture = TestBed.createComponent(SettingsModal);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    fixture.componentInstance.toggleDarkMode();

    expect(updateCalls).toEqual([true]);
    expect(darkModeSignal()).toBe(true);
    expect(fixture.componentInstance['saving']()).toBe(false);
  });

  it('rolls back on failure so the toggle reflects the real saved state', () => {
    updateResult = throwError(() => new Error('failed'));
    const fixture = TestBed.createComponent(SettingsModal);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    fixture.componentInstance.toggleDarkMode();

    expect(darkModeSignal()).toBe(false);
    expect(fixture.componentInstance['saving']()).toBe(false);
  });
});
