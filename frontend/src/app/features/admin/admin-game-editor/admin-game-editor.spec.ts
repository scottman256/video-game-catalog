import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';

import { AdminGame, GameUpdatePayload } from '../../../core/models/admin.model';
import { AdminService } from '../../../core/services/admin';
import { SystemService } from '../../../core/services/system';
import { PENDING_GAME } from '../../../testing/admin-fixtures';
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
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '10' }) } } },
        { provide: AdminService, useValue: adminStub() },
        { provide: SystemService, useValue: { list: () => of([PENDING_GAME.system]) } },
      ],
    });
    const router = TestBed.inject(Router);
    router.navigateByUrl = ((url: string) => (navigated.push(url), Promise.resolve(true))) as typeof router.navigateByUrl;
  });

  afterEach(() => (window.confirm = originalConfirm));

  function adminStub() {
    return {
      getGame: (id: number) => (calls.push(`get ${id}`), getResult),
      updateGame: (id: number, changes: GameUpdatePayload) => (
        calls.push(`update ${id}`), sentChanges.push(changes), of({ ...PENDING_GAME, ...changes })
      ),
      approveGame: (id: number, changes: GameUpdatePayload) => (
        calls.push(`approve ${id}`), sentChanges.push(changes), approveResult
      ),
      uploadImage: (id: number, kind: string, file: File) => (calls.push(`upload ${kind} ${file.name}`), of({})),
      deleteImage: (id: number, imageId: number) => (calls.push(`delete ${imageId}`), of(undefined)),
      deleteGame: (game: { id: number }) => (calls.push(`delete game ${game.id}`), of(undefined)),
    };
  }

  function render() {
    const fixture = TestBed.createComponent(AdminGameEditor);
    fixture.detectChanges();
    return fixture;
  }

  function fileInputEvent(...names: string[]): Event {
    const files = names.map((name) => new File(['x'], name, { type: 'image/png' }));
    return { target: { files, value: 'C:\\fakepath' } } as unknown as Event;
  }

  it('fills the form with the game being edited', () => {
    const fixture = render();

    expect(fixture.componentInstance['form'].getRawValue()).toEqual({
      title: 'Super Mario Bros',
      summary: 'A classic platformer',
      release_year: 1985,
      system_id: 1,
      esrb_rating: 'E',
    });
  });

  it('shows the pending badge and the green Approve button for a pending game', () => {
    const element: HTMLElement = render().nativeElement;

    expect(element.querySelector('app-pending-badge')).not.toBeNull();
    expect(element.querySelector('.btn-approve')?.textContent?.trim()).toBe('Approve');
  });

  it('hides the Approve button once a game is approved', () => {
    getResult = of({ ...PENDING_GAME, is_approved: true });

    const element: HTMLElement = render().nativeElement;

    expect(element.querySelector('.btn-approve')).toBeNull();
    expect(element.querySelector('app-pending-badge')).toBeNull();
  });

  describe('saved confirmation', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    function saveTitle(title: string) {
      const fixture = render();
      fixture.componentInstance['form'].controls.title.setValue(title);
      fixture.componentInstance.save();
      fixture.detectChanges();
      return fixture;
    }

    function savedText(fixture: ReturnType<typeof render>): string {
      return (fixture.nativeElement.querySelector('.game-editor__saved-region')?.textContent ?? '').trim();
    }

    it('saves edits and confirms next to the Save button', () => {
      const fixture = saveTitle('Super Mario Bros.');

      expect(sentChanges[0].title).toBe('Super Mario Bros.');
      expect(savedText(fixture)).toBe('Changes saved');
      expect(fixture.nativeElement.querySelector('.game-editor__save .game-editor__saved')).not.toBeNull();
    });

    it('announces the confirmation to screen readers', () => {
      const region = saveTitle('Super Mario Bros.').nativeElement.querySelector('output.game-editor__saved-region');

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

      fixture.componentInstance['form'].controls.summary.setValue('New summary');
      fixture.detectChanges();

      expect(savedText(fixture)).toBe('');
    });

    it('is not shown when saving fails', () => {
      TestBed.inject(AdminService).updateGame = () => throwError(() => ({ error: { detail: 'Nope' } }));

      const fixture = saveTitle('Super Mario Bros.');

      expect(savedText(fixture)).toBe('');
      expect(fixture.nativeElement.textContent).toContain('Nope');
    });
  });

  it('sends a blank summary as null', () => {
    const fixture = render();
    fixture.componentInstance['form'].controls.summary.setValue('   ');

    fixture.componentInstance.save();

    expect(sentChanges[0].summary).toBeNull();
  });

  it('approves with the unsaved edits in the form and returns to the queue', () => {
    const fixture = render();
    fixture.componentInstance['form'].controls.release_year.setValue(1986);

    fixture.componentInstance.approve();

    expect(calls).toContain('approve 10');
    expect(sentChanges[0].release_year).toBe(1986);
    expect(navigated).toEqual(['/admin/queue']);
  });

  it('stays on the page and explains when approving fails', () => {
    approveResult = throwError(() => ({ error: { detail: 'System 99 does not exist' } }));
    const fixture = render();

    fixture.componentInstance.approve();
    fixture.detectChanges();

    expect(navigated).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('System 99 does not exist');
  });

  it('uploads new box art and reloads the images without touching unsaved edits', () => {
    const fixture = render();
    fixture.componentInstance['form'].controls.title.setValue('Unsaved title');

    fixture.componentInstance.onBoxArtSelected(fileInputEvent('cover.png'));

    expect(calls).toEqual(['get 10', 'upload box_art cover.png', 'get 10']);
    expect(fixture.componentInstance['form'].controls.title.value).toBe('Unsaved title');
  });

  it('uploads every selected screenshot', () => {
    const fixture = render();

    fixture.componentInstance.onScreenshotsSelected(fileInputEvent('one.png', 'two.png'));

    expect(calls).toContain('upload screenshot one.png');
    expect(calls).toContain('upload screenshot two.png');
  });

  it('deletes a screenshot only after confirmation', () => {
    const fixture = render();
    const screenshot = PENDING_GAME.images[1];

    confirmAnswer = false;
    fixture.componentInstance.deleteImage(screenshot);
    confirmAnswer = true;
    fixture.componentInstance.deleteImage(screenshot);

    expect(calls.filter((call) => call.startsWith('delete'))).toEqual(['delete 101']);
  });

  it('deletes the game after confirmation and returns to All Games with a notice', () => {
    const router = TestBed.inject(Router);
    const navigations: unknown[] = [];
    router.navigateByUrl = ((url: string, extras: unknown) => (
      navigations.push([url, extras]), Promise.resolve(true)
    )) as typeof router.navigateByUrl;
    const fixture = render();

    fixture.nativeElement.querySelector('.game-editor__danger button').click();
    fixture.detectChanges();
    fixture.nativeElement.querySelector('[role="alertdialog"] .btn-danger').click();

    expect(calls).toContain('delete game 10');
    expect(navigations).toEqual([['/admin/games', { state: { deletedGameTitle: 'Super Mario Bros' } }]]);
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
    expect(describeAdminError({ error: { detail: 'Game 5 does not exist' } })).toBe('Game 5 does not exist');
  });

  it('falls back to a general message for validation error lists', () => {
    expect(describeAdminError({ error: { detail: [{ msg: 'bad' }] } })).toContain('Something went wrong');
  });
});
