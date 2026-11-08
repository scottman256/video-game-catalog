import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, Subject, of } from 'rxjs';

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

  function openModal(): ComponentFixture<SettingsModal> {
    const fixture = TestBed.createComponent(SettingsModal);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    return fixture;
  }

  function toggle(fixture: ComponentFixture<SettingsModal>): HTMLInputElement {
    const checkbox = fixture.nativeElement.querySelector('#dark-mode-toggle');
    checkbox.click();
    fixture.detectChanges();
    return checkbox;
  }

  function closedCount(fixture: ComponentFixture<SettingsModal>): () => number {
    let count = 0;
    fixture.componentInstance.closed.subscribe(() => count++);
    return () => count;
  }

  it('renders nothing when closed', () => {
    const fixture = TestBed.createComponent(SettingsModal);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.settings-modal')).toBeNull();
  });

  it('renders the dark mode toggle when open', () => {
    expect(openModal().nativeElement.querySelector('#dark-mode-toggle')).not.toBeNull();
  });

  it('emits closed when the close button is clicked', () => {
    const fixture = openModal();
    const closed = closedCount(fixture);

    fixture.nativeElement.querySelector('.settings-modal__close').click();

    expect(closed()).toBe(1);
  });

  it('emits closed from the backdrop or the Escape key, but not from clicks inside the dialog', () => {
    const fixture = openModal();
    const closed = closedCount(fixture);
    const backdrop = fixture.nativeElement.querySelector('.modal-backdrop');

    fixture.nativeElement.querySelector('.settings-modal').click();
    expect(closed()).toBe(0);

    backdrop.click();
    backdrop.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(closed()).toBe(2);
  });

  it('optimistically flips dark mode and persists it', () => {
    const fixture = openModal();

    const checkbox = toggle(fixture);

    expect(updateCalls).toEqual([true]);
    expect(darkModeSignal()).toBe(true);
    expect(checkbox.disabled).toBe(false);
  });

  it('disables the toggle while saving, then rolls back on failure so it reflects the real saved state', () => {
    const response = new Subject<Settings>();
    updateResult = response;
    const fixture = openModal();
    const checkbox = toggle(fixture);
    expect(checkbox.disabled).toBe(true);

    response.error(new Error('failed'));
    fixture.detectChanges();

    expect(darkModeSignal()).toBe(false);
    expect(checkbox.checked).toBe(false);
    expect(checkbox.disabled).toBe(false);
  });
});
