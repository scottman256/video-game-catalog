import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';

import { LibraryEntry } from '../../../core/models/library-entry.model';
import { LibraryService } from '../../../core/services/library';
import { todayAsIsoDate } from '../../../shared/utils/local-date';
import { buttonWithText, enterValue } from '../../../testing/dom';
import { PlayProgressForm } from './play-progress-form';

const ENTRY: LibraryEntry = {
  id: 5,
  game: {
    id: 10,
    title: 'Mario',
    release_year: 1985,
    system: { id: 1, name: 'NES', release_year: 1985 },
    box_art_url: null,
    is_approved: true,
  },
  ownership_type: 'digital',
  price_paid: null,
  added_at: '2024-01-01T00:00:00Z',
  weighted_score: null,
  completed_on: null,
  fully_completed_on: null,
  hours_played: null,
};
const PROGRESSED: LibraryEntry = {
  ...ENTRY,
  completed_on: '2026-09-01',
  fully_completed_on: '2026-09-20',
  hours_played: '42.5',
};

describe('PlayProgressForm', () => {
  let saveCalls: unknown[];
  let saveResult: Observable<LibraryEntry>;

  beforeEach(async () => {
    saveCalls = [];
    saveResult = of(PROGRESSED);
    const libraryStub = {
      updatePlayProgress: (id: number, payload: unknown) => (
        saveCalls.push([id, payload]),
        saveResult
      ),
    };

    await TestBed.configureTestingModule({
      imports: [PlayProgressForm],
      providers: [{ provide: LibraryService, useValue: libraryStub }],
    }).compileComponents();
  });

  function render(entry: LibraryEntry = ENTRY): ComponentFixture<PlayProgressForm> {
    const fixture = TestBed.createComponent(PlayProgressForm);
    fixture.componentRef.setInput('entry', entry);
    fixture.detectChanges();
    return fixture;
  }

  function checkbox(
    fixture: ComponentFixture<PlayProgressForm>,
    label: 'Completed' | '100% completed',
  ): HTMLInputElement {
    const labels = [
      ...fixture.nativeElement.querySelectorAll('.play-progress-form__check'),
    ] as HTMLLabelElement[];
    return labels
      .find((candidate) => candidate.textContent!.trim() === label)!
      .querySelector('input')!;
  }

  function toggle(
    fixture: ComponentFixture<PlayProgressForm>,
    label: 'Completed' | '100% completed',
  ): void {
    checkbox(fixture, label).click();
    fixture.detectChanges();
  }

  function dateInput(
    fixture: ComponentFixture<PlayProgressForm>,
    ariaLabel: string,
  ): HTMLInputElement {
    return fixture.nativeElement.querySelector(`input[aria-label="${ariaLabel}"]`);
  }

  function setDate(
    fixture: ComponentFixture<PlayProgressForm>,
    ariaLabel: string,
    value: string,
  ): void {
    enterValue(dateInput(fixture, ariaLabel), value);
    fixture.detectChanges();
  }

  function saveButton(fixture: ComponentFixture<PlayProgressForm>): HTMLButtonElement {
    return buttonWithText(fixture.nativeElement, 'Save progress');
  }

  function save(fixture: ComponentFixture<PlayProgressForm>): void {
    saveButton(fixture).click();
    fixture.detectChanges();
  }

  it('starts unticked with no date pickers for a game without progress', () => {
    const fixture = render();

    expect(fixture.nativeElement.querySelectorAll('input[type="checkbox"]:checked').length).toBe(0);
    expect(fixture.nativeElement.querySelector('input[type="date"]')).toBeNull();
  });

  it('loads saved progress from the library entry', () => {
    const fixture = render(PROGRESSED);

    expect(dateInput(fixture, 'Completed on').value).toBe('2026-09-01');
    expect(dateInput(fixture, '100% completed on').value).toBe('2026-09-20');
    expect(fixture.nativeElement.querySelector('#hours-played').value).toBe('42.5');
  });

  it('defaults the completed date to today when ticking Completed', () => {
    const fixture = render();

    toggle(fixture, 'Completed');

    expect(dateInput(fixture, 'Completed on').value).toBe(todayAsIsoDate());
    expect(dateInput(fixture, 'Completed on').max).toBe(todayAsIsoDate());
  });

  it('ticks Completed too when ticking 100%, both dated today', () => {
    const fixture = render();

    toggle(fixture, '100% completed');

    expect(checkbox(fixture, 'Completed').checked).toBe(true);
    expect(dateInput(fixture, 'Completed on').value).toBe(todayAsIsoDate());
    expect(dateInput(fixture, '100% completed on').value).toBe(todayAsIsoDate());
  });

  it('keeps an existing completed date when ticking 100%', () => {
    const fixture = render({ ...ENTRY, completed_on: '2026-09-01' });

    toggle(fixture, '100% completed');

    expect(dateInput(fixture, 'Completed on').value).toBe('2026-09-01');
  });

  it('keeps Completed when unticking 100%', () => {
    const fixture = render(PROGRESSED);

    toggle(fixture, '100% completed');

    expect(dateInput(fixture, '100% completed on')).toBeNull();
    expect(dateInput(fixture, 'Completed on').value).toBe('2026-09-01');
  });

  it('clears 100% when unticking Completed', () => {
    const fixture = render(PROGRESSED);

    toggle(fixture, 'Completed');

    expect(checkbox(fixture, '100% completed').checked).toBe(false);
    expect(fixture.nativeElement.querySelector('input[type="date"]')).toBeNull();
  });

  it('blocks saving when the 100% date is moved before the completed date', () => {
    const fixture = render(PROGRESSED);

    setDate(fixture, '100% completed on', '2026-08-01');

    expect(fixture.nativeElement.textContent).toContain(
      "The 100% date can't be before the completed date.",
    );
    expect(saveButton(fixture).disabled).toBe(true);
  });

  it('blocks saving when 100% is set but the completed date was cleared', () => {
    const fixture = render(PROGRESSED);

    setDate(fixture, 'Completed on', '');

    expect(fixture.nativeElement.textContent).toContain(
      'A game must be completed before it can be 100% completed.',
    );
    expect(saveButton(fixture).disabled).toBe(true);
  });

  it('saves progress, sending blanks as null, and emits the updated entry', () => {
    const fixture = render();
    const emitted: LibraryEntry[] = [];
    fixture.componentInstance.saved.subscribe((entry) => emitted.push(entry));
    toggle(fixture, 'Completed');

    save(fixture);

    expect(saveCalls).toEqual([
      [5, { completed_on: todayAsIsoDate(), fully_completed_on: null, hours_played: null }],
    ]);
    expect(emitted).toEqual([PROGRESSED]);
    expect(fixture.nativeElement.querySelector('output').textContent).toBe('Progress saved.');
  });

  it('sends hours played as entered', () => {
    const fixture = render();
    enterValue(fixture.nativeElement.querySelector('#hours-played'), '12.5');

    save(fixture);

    expect(saveCalls).toEqual([
      [5, { completed_on: null, fully_completed_on: null, hours_played: '12.5' }],
    ]);
  });

  it('shows the server message when it explains the problem, and re-enables saving', () => {
    saveResult = throwError(() => ({
      error: { detail: 'A game must be completed before it can be 100% completed' },
    }));
    const fixture = render();

    save(fixture);

    expect(fixture.nativeElement.textContent).toContain(
      'A game must be completed before it can be 100% completed',
    );
    expect(saveButton(fixture).disabled).toBe(false);
  });

  it('shows a generic message for field validation errors', () => {
    saveResult = throwError(() => ({
      error: { detail: [{ loc: ['body', 'hours_played'], msg: 'bad' }] },
    }));
    const fixture = render();

    save(fixture);

    expect(fixture.nativeElement.textContent).toContain(
      'Could not save your progress. Please check the values.',
    );
  });
});
