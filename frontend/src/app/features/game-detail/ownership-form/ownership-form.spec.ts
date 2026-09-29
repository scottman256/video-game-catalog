import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';

import { LibraryEntry } from '../../../core/models/library-entry.model';
import { LibraryService } from '../../../core/services/library';
import { OwnershipForm } from './ownership-form';

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
  price_paid: '19.99',
  added_at: '2024-01-01T00:00:00Z',
  weighted_score: null,
  completed_on: null,
  fully_completed_on: null,
  hours_played: null,
};

describe('OwnershipForm', () => {
  let updateCalls: unknown[];
  let updateResult: Observable<LibraryEntry>;

  beforeEach(async () => {
    updateCalls = [];
    updateResult = of({ ...ENTRY, ownership_type: 'physical' });
    const libraryStub = {
      update: (id: number, ownershipType: string, pricePaid: string | null) => (
        updateCalls.push([id, ownershipType, pricePaid]), updateResult
      ),
    };

    await TestBed.configureTestingModule({
      imports: [OwnershipForm],
      providers: [{ provide: LibraryService, useValue: libraryStub }],
    }).compileComponents();
  });

  function render() {
    const fixture = TestBed.createComponent(OwnershipForm);
    fixture.componentRef.setInput('entry', ENTRY);
    fixture.detectChanges();
    return fixture;
  }

  function radio(fixture: ReturnType<typeof render>, value: string): HTMLInputElement {
    return fixture.nativeElement.querySelector(`input[value="${value}"]`);
  }

  it('starts with the current ownership type selected', () => {
    const fixture = render();

    expect(radio(fixture, 'digital').checked).toBe(true);
    expect(radio(fixture, 'physical').checked).toBe(false);
  });

  it('disables Save until the ownership type changes', () => {
    const fixture = render();
    const saveButton = fixture.nativeElement.querySelector('.ownership-form button');
    expect(saveButton.disabled).toBe(true);

    fixture.componentInstance.choose('physical');
    fixture.detectChanges();

    expect(saveButton.disabled).toBe(false);
  });

  it('saves the new ownership type, keeps the price, and emits the updated entry', () => {
    const fixture = render();
    const emitted: LibraryEntry[] = [];
    fixture.componentInstance.saved.subscribe((entry) => emitted.push(entry));
    fixture.componentInstance.choose('physical');

    fixture.componentInstance.submit();

    expect(updateCalls).toEqual([[5, 'physical', '19.99']]);
    expect(emitted[0].ownership_type).toBe('physical');
    expect(fixture.componentInstance['savedMessage']()).toBe('Saved as physical.');
  });

  it('shows an error when saving fails', () => {
    updateResult = throwError(() => new Error('failed'));
    const fixture = render();
    fixture.componentInstance.choose('physical');

    fixture.componentInstance.submit();

    expect(fixture.componentInstance['saving']()).toBe(false);
    expect(fixture.componentInstance['errorMessage']()).toBe('Could not update your copy. Please try again.');
  });
});
