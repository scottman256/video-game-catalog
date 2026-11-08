import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';

import { Game } from '../../../core/models/game.model';
import { GameService } from '../../../core/services/game';
import { SystemService } from '../../../core/services/system';
import { buttonWithText, enterValue, selectFiles } from '../../../testing/dom';
import { AddGameForm } from './add-game-form';

const GAME: Game = {
  id: 1,
  title: 'Mario',
  summary: null,
  release_year: 1985,
  esrb_rating: 'E',
  system: { id: 1, name: 'NES', release_year: 1985 },
  images: [],
  community_average_score: null,
  in_library: false,
  in_wishlist: false,
  is_approved: true,
};

describe('AddGameForm', () => {
  let createCalls: unknown[];
  let uploadCalls: unknown[];
  let createResult: Observable<Game>;

  beforeEach(async () => {
    createCalls = [];
    uploadCalls = [];
    createResult = of(GAME);
    const gameStub = {
      create: (payload: unknown) => (createCalls.push(payload), createResult),
      uploadImage: (gameId: number, kind: string, file: File) => (
        uploadCalls.push([gameId, kind, file.name]),
        of({})
      ),
      getById: () => of(GAME),
    };
    const systemStub = { list: () => of([{ id: 1, name: 'NES', release_year: 1985 }]) };

    await TestBed.configureTestingModule({
      imports: [AddGameForm],
      providers: [
        { provide: GameService, useValue: gameStub },
        { provide: SystemService, useValue: systemStub },
      ],
    }).compileComponents();
  });

  function render(): ComponentFixture<AddGameForm> {
    const fixture = TestBed.createComponent(AddGameForm);
    fixture.detectChanges();
    return fixture;
  }

  function fillRequiredFields(fixture: ComponentFixture<AddGameForm>): void {
    const element: HTMLElement = fixture.nativeElement;
    enterValue(element.querySelector('#title')!, 'Mario');
    const systemSelect = element.querySelector<HTMLSelectElement>('#system_id')!;
    enterValue(systemSelect, systemSelect.options[1].value);
    fixture.detectChanges();
  }

  function submit(fixture: ComponentFixture<AddGameForm>): void {
    buttonWithText(fixture.nativeElement, 'Add game').click();
    fixture.detectChanges();
  }

  it('lists the systems to choose from', () => {
    const options = render().nativeElement.querySelectorAll('#system_id option');

    expect(options[1].textContent).toBe('NES (1985)');
  });

  it('keeps the submit button disabled and does not submit until the form is valid', () => {
    const fixture = render();

    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));

    expect(buttonWithText(fixture.nativeElement, 'Add game').disabled).toBe(true);
    expect(createCalls.length).toBe(0);
  });

  it('creates a game and emits it when there are no images', () => {
    const fixture = render();
    fillRequiredFields(fixture);
    let created: Game | undefined;
    fixture.componentInstance.created.subscribe((game) => (created = game));

    submit(fixture);

    expect(createCalls).toEqual([
      {
        title: 'Mario',
        summary: null,
        release_year: new Date().getFullYear(),
        system_id: 1,
        esrb_rating: 'E',
      },
    ]);
    expect(created).toEqual(GAME);
    expect(uploadCalls).toEqual([]);
  });

  it('uploads the selected box art and screenshots after creating the game', () => {
    const fixture = render();
    fillRequiredFields(fixture);
    selectFiles(fixture.nativeElement.querySelector('#box_art'), [new File(['a'], 'cover.png')]);
    selectFiles(fixture.nativeElement.querySelector('#screenshots'), [
      new File(['b'], 'shot1.png'),
      new File(['c'], 'shot2.png'),
    ]);

    submit(fixture);

    expect(uploadCalls).toEqual([
      [1, 'box_art', 'cover.png'],
      [1, 'screenshot', 'shot1.png'],
      [1, 'screenshot', 'shot2.png'],
    ]);
  });

  it('does not upload box art when the selection is cleared', () => {
    const fixture = render();
    fillRequiredFields(fixture);
    const boxArtInput = fixture.nativeElement.querySelector('#box_art');
    selectFiles(boxArtInput, [new File(['a'], 'cover.png')]);
    selectFiles(boxArtInput, []);

    submit(fixture);

    expect(uploadCalls).toEqual([]);
  });

  it('resets saving and shows the server error when the request fails, so the button is not stuck disabled', () => {
    createResult = throwError(() => ({ error: { detail: 'Image exceeds the 5 MB size limit' } }));
    const fixture = render();
    fillRequiredFields(fixture);

    submit(fixture);

    expect(fixture.nativeElement.textContent).toContain('Image exceeds the 5 MB size limit');
    expect(buttonWithText(fixture.nativeElement, 'Add game').disabled).toBe(false);
  });

  it('falls back to a generic message when the request fails without a reason', () => {
    createResult = throwError(() => new Error('failed'));
    const fixture = render();
    fillRequiredFields(fixture);

    submit(fixture);

    expect(fixture.nativeElement.textContent).toContain(
      'Could not add this game. Please check the form and try again.',
    );
  });
});
