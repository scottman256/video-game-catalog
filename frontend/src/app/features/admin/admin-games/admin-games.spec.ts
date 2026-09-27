import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';

import { AdminGameSummary } from '../../../core/models/admin.model';
import { AdminService } from '../../../core/services/admin';
import { APPROVED_GAME_SUMMARY, PENDING_GAME_SUMMARY } from '../../../testing/admin-fixtures';
import { AdminGames, DELETED_GAME_TITLE } from './admin-games';

describe('AdminGames', () => {
  let listCalls: [string, string][];
  let listResult: Observable<AdminGameSummary[]>;

  beforeEach(() => {
    listCalls = [];
    listResult = of([PENDING_GAME_SUMMARY, APPROVED_GAME_SUMMARY]);
    const adminStub = {
      listGames: (query: string, status: string) => (listCalls.push([query, status]), listResult),
      deleteGame: () => of(undefined),
    };
    TestBed.configureTestingModule({
      imports: [AdminGames],
      providers: [provideRouter([]), { provide: AdminService, useValue: adminStub }],
    });
  });

  it('loads every game on open', () => {
    const fixture = TestBed.createComponent(AdminGames);
    fixture.detectChanges();

    expect(listCalls).toEqual([['', 'all']]);
    expect(fixture.nativeElement.querySelectorAll('.admin-game-list__row').length).toBe(2);
  });

  it('searches by trimmed title within the chosen status', () => {
    const fixture = TestBed.createComponent(AdminGames);
    fixture.componentInstance.changeStatus('pending');

    fixture.componentInstance.search('  mario ');

    expect(listCalls.at(-1)).toEqual(['mario', 'pending']);
  });

  it('says so when nothing matches', () => {
    listResult = of([]);
    const fixture = TestBed.createComponent(AdminGames);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No games match.');
  });

  it('shows an error when the catalog cannot load', () => {
    listResult = throwError(() => new Error('down'));
    const fixture = TestBed.createComponent(AdminGames);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Could not load the catalog.');
  });

  it('deletes a game from the list after confirmation and says so', () => {
    const fixture = TestBed.createComponent(AdminGames);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.admin-game-list__delete').click();
    fixture.detectChanges();
    const dialogDelete = [...fixture.nativeElement.querySelectorAll('[role="alertdialog"] button')].find(
      (button: HTMLButtonElement) => button.textContent?.includes('Delete game'),
    );
    dialogDelete.click();
    fixture.detectChanges();

    const titles = [...fixture.nativeElement.querySelectorAll('.admin-game-list__title')].map((title) =>
      (title as HTMLElement).textContent,
    );
    expect(titles).toEqual(['The Legend of Zelda']);
    expect(fixture.nativeElement.querySelector('[role="alertdialog"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('.notice').textContent).toContain(
      '“Super Mario Bros” was deleted.',
    );
  });

  it('announces a game that was deleted from its edit page', () => {
    const router = TestBed.inject(Router) as unknown as { currentNavigation: () => unknown };
    router.currentNavigation = () => ({ extras: { state: { [DELETED_GAME_TITLE]: 'Pragmata' } } });

    const fixture = TestBed.createComponent(AdminGames);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('“Pragmata” was deleted.');
  });

  it('lets the admin dismiss the deleted notice', () => {
    const router = TestBed.inject(Router) as unknown as { currentNavigation: () => unknown };
    router.currentNavigation = () => ({ extras: { state: { [DELETED_GAME_TITLE]: 'Pragmata' } } });
    const fixture = TestBed.createComponent(AdminGames);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.notice__dismiss').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.notice')).toBeNull();
  });
});
