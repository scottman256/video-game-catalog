import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';

import { LibraryEntry } from '../../../core/models/library-entry.model';
import { LibraryService } from '../../../core/services/library';
import { todayAsIsoDate } from '../../../shared/utils/local-date';
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
      updatePlayProgress: (id: number, payload: unknown) => (saveCalls.push([id, payload]), saveResult),
    };

    await TestBed.configureTestingModule({
      imports: [PlayProgressForm],
      providers: [{ provide: LibraryService, useValue: libraryStub }],
    }).compileComponents();
  });

  function render(entry: LibraryEntry = ENTRY) {
    const fixture = TestBed.createComponent(PlayProgressForm);
    fixture.componentRef.setInput('entry', entry);
    fixture.detectChanges();
    return fixture;
  }

  function signalValue<T>(fixture: ReturnType<typeof render>, name: string): T {
    return (fixture.componentInstance as unknown as Record<string, () => T>)[name]();
  }

  it('starts unticked with no date pickers for a game without progress', () => {
    const fixture = render();

    expect(fixture.nativeElement.querySelectorAll('input[type="checkbox"]:checked').length).toBe(0);
    expect(fixture.nativeElement.querySelector('input[type="date"]')).toBeNull();
  });

  it('loads saved progress from the library entry', () => {
    const fixture = render(PROGRESSED);

    const dates = [...fixture.nativeElement.querySelectorAll('input[type="date"]')] as HTMLInputElement[];
    expect(dates.map((input) => input.value)).toEqual(['2026-09-01', '2026-09-20']);
    expect(fixture.nativeElement.querySelector('#hours-played').value).toBe('42.5');
  });

  it('defaults the completed date to today when ticking Completed', () => {
    const fixture = render();

    fixture.componentInstance.setCompleted(true);
    fixture.detectChanges();

    expect(signalValue(fixture, 'completedOn')).toBe(todayAsIsoDate());
    expect(fixture.nativeElement.querySelector('input[aria-label="Completed on"]').max).toBe(todayAsIsoDate());
  });

  it('ticks Completed too when ticking 100%, both dated today', () => {
    const fixture = render();

    fixture.componentInstance.setFullyCompleted(true);

    expect(signalValue(fixture, 'completedOn')).toBe(todayAsIsoDate());
    expect(signalValue(fixture, 'fullyCompletedOn')).toBe(todayAsIsoDate());
  });

  it('keeps an existing completed date when ticking 100%', () => {
    const fixture = render({ ...ENTRY, completed_on: '2026-09-01' });

    fixture.componentInstance.setFullyCompleted(true);

    expect(signalValue(fixture, 'completedOn')).toBe('2026-09-01');
  });

  it('clears 100% when unticking Completed', () => {
    const fixture = render(PROGRESSED);

    fixture.componentInstance.setCompleted(false);

    expect(signalValue(fixture, 'completedOn')).toBe('');
    expect(signalValue(fixture, 'fullyCompletedOn')).toBe('');
  });

  it('blocks saving when the 100% date is before the completed date', () => {
    const fixture = render({ ...PROGRESSED, fully_completed_on: '2026-08-01' });

    expect(signalValue(fixture, 'validationError')).toBe("The 100% date can't be before the completed date.");
    expect(fixture.nativeElement.querySelector('.play-progress-form__actions button').disabled).toBe(true);
  });

  it('blocks saving when 100% is set but the completed date was cleared', () => {
    const fixture = render(PROGRESSED);

    (fixture.componentInstance as unknown as { completedOn: { set(value: string): void } }).completedOn.set('');

    expect(signalValue(fixture, 'validationError')).toBe(
      'A game must be completed before it can be 100% completed.',
    );
  });

  it('saves progress, sending blanks as null, and emits the updated entry', () => {
    const fixture = render();
    const emitted: LibraryEntry[] = [];
    fixture.componentInstance.saved.subscribe((entry) => emitted.push(entry));
    fixture.componentInstance.setCompleted(true);

    fixture.componentInstance.submit();

    expect(saveCalls).toEqual([
      [5, { completed_on: todayAsIsoDate(), fully_completed_on: null, hours_played: null }],
    ]);
    expect(emitted).toEqual([PROGRESSED]);
    expect(signalValue(fixture, 'savedMessage')).toBe('Progress saved.');
  });

  it('sends hours played as entered', () => {
    const fixture = render();
    (fixture.componentInstance as unknown as { hoursPlayed: { set(value: string): void } }).hoursPlayed.set('12.5');

    fixture.componentInstance.submit();

    expect(saveCalls).toEqual([[5, { completed_on: null, fully_completed_on: null, hours_played: '12.5' }]]);
  });

  it('shows the server message when it explains the problem', () => {
    saveResult = throwError(() => ({ error: { detail: 'A game must be completed before it can be 100% completed' } }));
    const fixture = render();

    fixture.componentInstance.submit();

    expect(signalValue(fixture, 'errorMessage')).toBe('A game must be completed before it can be 100% completed');
    expect(signalValue(fixture, 'saving')).toBe(false);
  });

  it('shows a generic message for field validation errors', () => {
    saveResult = throwError(() => ({ error: { detail: [{ loc: ['body', 'hours_played'], msg: 'bad' }] } }));
    const fixture = render();

    fixture.componentInstance.submit();

    expect(signalValue(fixture, 'errorMessage')).toBe('Could not save your progress. Please check the values.');
  });
});
