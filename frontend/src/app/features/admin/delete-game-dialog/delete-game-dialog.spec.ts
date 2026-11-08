import { TestBed } from '@angular/core/testing';
import { NEVER, Observable, of, throwError } from 'rxjs';

import { AdminService } from '../../../core/services/admin';
import { DeletableGame, DeleteGameDialog } from './delete-game-dialog';

const GAME: DeletableGame = { id: 10, title: 'Pragmata', is_approved: false };

describe('DeleteGameDialog', () => {
  let deleteCalls: DeletableGame[];
  let deleteResult: Observable<void>;

  beforeEach(() => {
    deleteCalls = [];
    deleteResult = of(undefined);
    const adminStub = { deleteGame: (game: DeletableGame) => (deleteCalls.push(game), deleteResult) };
    TestBed.configureTestingModule({
      imports: [DeleteGameDialog],
      providers: [{ provide: AdminService, useValue: adminStub }],
    });
  });

  function render(game: DeletableGame | null = GAME) {
    const fixture = TestBed.createComponent(DeleteGameDialog);
    fixture.componentRef.setInput('game', game);
    fixture.detectChanges();
    return fixture;
  }

  function button(fixture: ReturnType<typeof render>, label: string): HTMLButtonElement {
    return [...fixture.nativeElement.querySelectorAll('button')].find((candidate: HTMLButtonElement) =>
      candidate.textContent?.includes(label),
    );
  }

  it('stays closed until a game is chosen', () => {
    expect(render(null).nativeElement.querySelector('[role="alertdialog"]')).toBeNull();
  });

  it('names the game and warns that players lose it from their libraries', () => {
    const text = render().nativeElement.textContent;

    expect(text).toContain('Delete “Pragmata”?');
    expect(text).toContain("every player's library entry");
    expect(text).toContain("can't be undone");
  });

  it('starts with focus on Cancel so Enter cannot delete by accident', () => {
    const fixture = render();

    expect(document.activeElement).toBe(button(fixture, 'Cancel'));
  });

  it('deletes the game and reports it when confirmed', () => {
    const fixture = render();
    const deleted: DeletableGame[] = [];
    fixture.componentInstance.deleted.subscribe((game) => deleted.push(game));

    button(fixture, 'Delete game').click();

    expect(deleteCalls).toEqual([GAME]);
    expect(deleted).toEqual([GAME]);
  });

  it('cancels without deleting', () => {
    const fixture = render();
    let cancelled = false;
    fixture.componentInstance.cancelled.subscribe(() => (cancelled = true));

    button(fixture, 'Cancel').click();

    expect(cancelled).toBe(true);
    expect(deleteCalls).toEqual([]);
  });

  it('cancels from the backdrop or the Escape key, but not from clicks inside the dialog', () => {
    const fixture = render();
    let cancelCount = 0;
    fixture.componentInstance.cancelled.subscribe(() => cancelCount++);
    const backdrop = fixture.nativeElement.querySelector('.modal-backdrop');

    fixture.nativeElement.querySelector('[role="alertdialog"]').click();
    expect(cancelCount).toBe(0);

    backdrop.click();
    backdrop.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(cancelCount).toBe(2);
  });

  it('shows progress and cannot be dismissed while the delete is in flight', () => {
    deleteResult = NEVER;
    const fixture = render();
    let cancelled = false;
    fixture.componentInstance.cancelled.subscribe(() => (cancelled = true));

    button(fixture, 'Delete game').click();
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.modal-backdrop').click();

    expect(button(fixture, 'Deleting…').disabled).toBe(true);
    expect(button(fixture, 'Cancel').disabled).toBe(true);
    expect(cancelled).toBe(false);
  });

  it('keeps the dialog open with an explanation when deleting fails', () => {
    deleteResult = throwError(() => new Error('down'));
    const fixture = render();
    const deleted: DeletableGame[] = [];
    fixture.componentInstance.deleted.subscribe((game) => deleted.push(game));

    button(fixture, 'Delete game').click();
    fixture.detectChanges();

    expect(deleted).toEqual([]);
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Could not delete "Pragmata"');
  });
});
