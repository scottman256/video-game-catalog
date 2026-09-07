import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';

import { Game } from '../../../core/models/game.model';
import { GameService } from '../../../core/services/game';
import { SystemService } from '../../../core/services/system';
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
      uploadImage: (gameId: number, kind: string, file: File) => (uploadCalls.push([gameId, kind, file]), of({})),
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

  it('loads systems on init', () => {
    const fixture = TestBed.createComponent(AddGameForm);
    fixture.detectChanges();

    expect(fixture.componentInstance['systems']()).toEqual([{ id: 1, name: 'NES', release_year: 1985 }]);
  });

  it('does not submit an invalid form', () => {
    const fixture = TestBed.createComponent(AddGameForm);
    fixture.detectChanges();
    fixture.componentInstance['form'].patchValue({ title: '' });

    fixture.componentInstance.submit();

    expect(createCalls.length).toBe(0);
  });

  it('creates a game and emits it when there are no images', () => {
    const fixture = TestBed.createComponent(AddGameForm);
    fixture.detectChanges();
    fixture.componentInstance['form'].patchValue({ title: 'Mario', system_id: 1 });
    let created: Game | undefined;
    fixture.componentInstance.created.subscribe((game) => (created = game));

    fixture.componentInstance.submit();

    expect(createCalls).toEqual([
      { title: 'Mario', summary: null, release_year: new Date().getFullYear(), system_id: 1, esrb_rating: 'E' },
    ]);
    expect(created).toEqual(GAME);
  });

  it('uploads selected box art and screenshots after creating the game', () => {
    const fixture = TestBed.createComponent(AddGameForm);
    fixture.detectChanges();
    fixture.componentInstance['form'].patchValue({ title: 'Mario', system_id: 1 });
    fixture.componentInstance['boxArtFile'] = new File(['a'], 'cover.png');
    fixture.componentInstance['screenshotFiles'] = [new File(['b'], 'shot1.png')];

    fixture.componentInstance.submit();

    expect(uploadCalls.length).toBe(2);
  });

  it('resets saving and shows an error when the request fails, so the button is not stuck disabled', () => {
    createResult = throwError(() => ({ error: { detail: 'Image exceeds the 5 MB size limit' } }));
    const fixture = TestBed.createComponent(AddGameForm);
    fixture.detectChanges();
    fixture.componentInstance['form'].patchValue({ title: 'Mario', system_id: 1 });

    fixture.componentInstance.submit();

    expect(fixture.componentInstance['saving']()).toBe(false);
    expect(fixture.componentInstance['errorMessage']()).toBe('Image exceeds the 5 MB size limit');
  });
});
