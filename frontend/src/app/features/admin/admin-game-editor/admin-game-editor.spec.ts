import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { NEVER, Observable, of, throwError } from 'rxjs';

import { AdminGame, GameUpdatePayload } from '../../../core/models/admin.model';
import { AdminService } from '../../../core/services/admin';
import { SystemService } from '../../../core/services/system';
import { PENDING_GAME } from '../../../testing/admin-fixtures';
import { buttonWithText, enterValue, selectFiles } from '../../../testing/dom';
import { AdminGameEditor, SAVED_CONFIRMATION_MS, describeAdminError } from './admin-game-editor';

describe('AdminGameEditor', () => {
  let calls: string[];
  let sentChanges: GameUpdatePayload[];
  let getResult: Observable<AdminGame>;
  let approveResult: Observable<AdminGame>;
  let navigated: string[];
  let confirmAnswer: boolean;
  const originalConfirm = window.confirm;

  beforeEach(() => {
    calls = [];
    sentChanges = [];
    navigated = [];
    confirmAnswer = true;
    getResult = of(PENDING_GAME);
    approveResult = of({ ...PENDING_GAME, is_approved: true });
    window.confirm = () => confirmAnswer;
    TestBed.configureTestingModule({
      imports: [AdminGameEditor],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: '10' }) } },
        },
        { provide: AdminService, useValue: adminStub() },
        { provide: SystemService, useValue: { list: () => of([PENDING_GAME.system]) } },
      ],
    });
    const router = TestBed.inject(Router);
    router.navigateByUrl = ((url: string) => (
      navigated.push(url),
      Promise.resolve(true)
    )) as typeof router.navigateByUrl;
  });

  afterEach(() => (window.confirm = originalConfirm));

  function adminStub() {
    return {
      getGame: (id: number) => (calls.push(`get ${id}`), getResult),
      updateGame: (id: number, changes: GameUpdatePayload) => (
        calls.push(`update ${id}`),
        sentChanges.push(changes),
        of({ ...PENDING_GAME, ...changes })
      ),
      approveGame: (id: number, changes: GameUpdatePayload) => (
        calls.push(`approve ${id}`),
        sentChanges.push(changes),
        approveResult
      ),
      uploadImage: (id: number, kind: string, file: File) => (
        calls.push(`upload ${kind} ${file.name}`),
        of({})
      ),
      deleteImage: (id: number, imageId: number) => (
        calls.push(`delete ${imageId}`),
        of(undefined)
      ),
      deleteGame: (game: { id: number }) => (calls.push(`delete game ${game.id}`), of(undefined)),
    };
  }

  function render(): ComponentFixture<AdminGameEditor> {
    const fixture = TestBed.createComponent(AdminGameEditor);
    fixture.detectChanges();
    return fixture;
  }

  function field<T extends HTMLElement>(
    fixture: ComponentFixture<AdminGameEditor>,
    selector: string,
  ): T {
    return fixture.nativeElement.querySelector(selector);
  }

  function edit(fixture: ComponentFixture<AdminGameEditor>, selector: string, value: string): void {
    enterValue(field(fixture, selector), value);
    fixture.detectChanges();
  }

  function click(fixture: ComponentFixture<AdminGameEditor>, label: string): void {
    buttonWithText(fixture.nativeElement, label).click();
    fixture.detectChanges();
  }

  function fileInputs(fixture: ComponentFixture<AdminGameEditor>): HTMLInputElement[] {
    return [...fixture.nativeElement.querySelectorAll('input[type="file"]')];
  }

  function images(...names: string[]): File[] {
    return names.map((name) => new File(['x'], name, { type: 'image/png' }));
  }

  it('fills the form with the game being edited', () => {
    const fixture = render();

    expect(field<HTMLInputElement>(fixture, '#title').value).toBe('Super Mario Bros');
    expect(field<HTMLTextAreaElement>(fixture, '#summary').value).toBe('A classic platformer');
    expect(field<HTMLInputElement>(fixture, '#release_year').value).toBe('1985');
  });

  it('shows a loading message until the game arrives', () => {
    getResult = NEVER;

    expect(render().nativeElement.textContent).toContain('Loading…');
  });

  it('shows the pending badge, a link back to the queue, and the green Approve button for a pending game', () => {
    const element: HTMLElement = render().nativeElement;

    expect(element.querySelector('app-pending-badge')).not.toBeNull();
    expect(element.querySelector('.game-editor__back')!.textContent!.trim()).toBe(
      '← Approval Queue',
    );
    expect(element.querySelector('.btn-approve')?.textContent?.trim()).toBe('Approve');
  });

  it('hides the Approve button once a game is approved and links back to All Games', () => {
    getResult = of({ ...PENDING_GAME, is_approved: true });

    const element: HTMLElement = render().nativeElement;

    expect(element.querySelector('.btn-approve')).toBeNull();
    expect(element.querySelector('app-pending-badge')).toBeNull();
    expect(element.querySelector('.game-editor__back')!.textContent!.trim()).toBe('← All Games');
  });

  it('shows the existing box art and screenshots', () => {
    const fixture = render();

    expect(field<HTMLImageElement>(fixture, '.game-editor__box-art img').src).toBe(
      'http://localhost/box.png',
    );
    expect(fixture.nativeElement.querySelectorAll('.game-editor__screenshot').length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Replace box art');
  });

  it('invites uploads when the game has no images yet', () => {
    getResult = of({ ...PENDING_GAME, images: [] });

    const text = render().nativeElement.textContent;

    expect(text).toContain('No box art yet');
    expect(text).toContain('Upload box art');
    expect(text).toContain('No screenshots yet');
  });

  describe('saved confirmation', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    function saveTitle(title: string): ComponentFixture<AdminGameEditor> {
      const fixture = render();
      edit(fixture, '#title', title);
      click(fixture, 'Save changes');
      return fixture;
    }

    function savedText(fixture: ComponentFixture<AdminGameEditor>): string {
      return (
        fixture.nativeElement.querySelector('.game-editor__saved-region')?.textContent ?? ''
      ).trim();
    }

    it('saves edits and confirms next to the Save button', () => {
      const fixture = saveTitle('Super Mario Bros.');

      expect(sentChanges[0].title).toBe('Super Mario Bros.');
      expect(savedText(fixture)).toBe('Changes saved');
      expect(
        fixture.nativeElement.querySelector('.game-editor__save .game-editor__saved'),
      ).not.toBeNull();
    });

    it('announces the confirmation to screen readers', () => {
      const region = saveTitle('Super Mario Bros.').nativeElement.querySelector(
        'output.game-editor__saved-region',
      );

      expect(region.getAttribute('aria-live')).toBe('polite');
    });

    it('fades away on its own after a few seconds', () => {
      const fixture = saveTitle('Super Mario Bros.');

      vi.advanceTimersByTime(SAVED_CONFIRMATION_MS);
      fixture.detectChanges();

      expect(savedText(fixture)).toBe('');
    });

    it('disappears as soon as the form is edited again', () => {
      const fixture = saveTitle('Super Mario Bros.');

      edit(fixture, '#summary', 'New summary');

      expect(savedText(fixture)).toBe('');
    });

    it('is not shown when saving fails', () => {
      TestBed.inject(AdminService).updateGame = () =>
        throwError(() => ({ error: { detail: 'Nope' } }));

      const fixture = saveTitle('Super Mario Bros.');

      expect(savedText(fixture)).toBe('');
      expect(fixture.nativeElement.textContent).toContain('Nope');
    });
  });

  it('sends a blank summary as null', () => {
    const fixture = render();
    edit(fixture, '#summary', '   ');

    click(fixture, 'Save changes');

    expect(sentChanges[0].summary).toBeNull();
  });

  it('does not allow saving an invalid form', () => {
    const fixture = render();

    edit(fixture, '#title', '');

    expect(buttonWithText(fixture.nativeElement, 'Save changes').disabled).toBe(true);
    expect(buttonWithText(fixture.nativeElement, 'Approve').disabled).toBe(true);
  });

  it('approves with the unsaved edits in the form and returns to the queue', () => {
    const fixture = render();
    edit(fixture, '#release_year', '1986');

    click(fixture, 'Approve');

    expect(calls).toContain('approve 10');
    expect(sentChanges[0].release_year).toBe(1986);
    expect(navigated).toEqual(['/admin/queue']);
  });

  it('stays on the page and explains when approving fails', () => {
    approveResult = throwError(() => ({ error: { detail: 'System 99 does not exist' } }));
    const fixture = render();

    click(fixture, 'Approve');

    expect(navigated).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('System 99 does not exist');
  });

  it('uploads new box art and reloads the images without touching unsaved edits', () => {
    const fixture = render();
    edit(fixture, '#title', 'Unsaved title');

    selectFiles(fileInputs(fixture)[0], images('cover.png'));

    expect(calls).toEqual(['get 10', 'upload box_art cover.png', 'get 10']);
    expect(field<HTMLInputElement>(fixture, '#title').value).toBe('Unsaved title');
  });

  it('uploads every selected screenshot', () => {
    const fixture = render();

    selectFiles(fileInputs(fixture)[1], images('one.png', 'two.png'));

    expect(calls).toContain('upload screenshot one.png');
    expect(calls).toContain('upload screenshot two.png');
  });

  it('does nothing when the file picker is closed without choosing a file', () => {
    const fixture = render();

    selectFiles(fileInputs(fixture)[1], []);

    expect(calls).toEqual(['get 10']);
  });

  it('deletes a screenshot only after confirmation', () => {
    const fixture = render();
    const deleteButton = field<HTMLButtonElement>(fixture, '.game-editor__delete');

    confirmAnswer = false;
    deleteButton.click();
    confirmAnswer = true;
    deleteButton.click();

    expect(calls.filter((call) => call.startsWith('delete'))).toEqual(['delete 101']);
  });

  it('deletes the game after confirmation and returns to All Games with a notice', () => {
    const router = TestBed.inject(Router);
    const navigations: unknown[] = [];
    router.navigateByUrl = ((url: string, extras: unknown) => (
      navigations.push([url, extras]),
      Promise.resolve(true)
    )) as typeof router.navigateByUrl;
    const fixture = render();

    fixture.nativeElement.querySelector('.game-editor__danger button').click();
    fixture.detectChanges();
    fixture.nativeElement.querySelector('[role="alertdialog"] .btn-danger').click();

    expect(calls).toContain('delete game 10');
    expect(navigations).toEqual([
      ['/admin/games', { state: { deletedGameTitle: 'Super Mario Bros' } }],
    ]);
  });

  it('closes the delete dialog without deleting when cancelled', () => {
    const fixture = render();
    fixture.nativeElement.querySelector('.game-editor__danger button').click();
    fixture.detectChanges();

    fixture.nativeElement.querySelector('[role="alertdialog"] .btn-secondary').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alertdialog"]')).toBeNull();
    expect(calls.some((call) => call.startsWith('delete game'))).toBe(false);
  });

  it('shows an error when the game cannot be loaded', () => {
    getResult = throwError(() => new Error('missing'));

    expect(render().nativeElement.textContent).toContain('Could not load this game.');
  });
});

describe('describeAdminError', () => {
  it('uses the server message when there is one', () => {
    expect(describeAdminError({ error: { detail: 'Game 5 does not exist' } })).toBe(
      'Game 5 does not exist',
    );
  });

  it('falls back to a general message for validation error lists', () => {
    expect(describeAdminError({ error: { detail: [{ msg: 'bad' }] } })).toContain(
      'Something went wrong',
    );
  });
});
