import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AdminGameSummary } from '../../../core/models/admin.model';
import { APPROVED_GAME_SUMMARY, PENDING_GAME_SUMMARY } from '../../../testing/admin-fixtures';
import { AdminGameList } from './admin-game-list';

describe('AdminGameList', () => {
  function render(inputs: { actionLabel?: string; showDelete?: boolean } = {}) {
    TestBed.configureTestingModule({ imports: [AdminGameList], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(AdminGameList);
    fixture.componentRef.setInput('games', [PENDING_GAME_SUMMARY, APPROVED_GAME_SUMMARY]);
    Object.entries(inputs).forEach(([name, value]) => fixture.componentRef.setInput(name, value));
    fixture.detectChanges();
    return fixture;
  }

  it('links every game to its editor', () => {
    const links = [...render().nativeElement.querySelectorAll('.admin-game-list__link')].map((link) =>
      (link as HTMLElement).getAttribute('href'),
    );

    expect(links).toEqual(['/admin/games/10', '/admin/games/11']);
  });

  it('marks only pending games with the pending badge', () => {
    const rows = render().nativeElement.querySelectorAll('.admin-game-list__row');

    expect(rows[0].querySelector('app-pending-badge')).not.toBeNull();
    expect(rows[1].querySelector('app-pending-badge')).toBeNull();
  });

  it('shows who submitted each game', () => {
    expect(render().nativeElement.textContent).toContain('Submitted by scott');
  });

  it('uses the given action label', () => {
    const action = render({ actionLabel: 'Review' }).nativeElement.querySelector('.admin-game-list__action');

    expect(action.textContent.trim()).toBe('Review');
  });

  it('hides the delete button unless asked to show it', () => {
    expect(render().nativeElement.querySelector('.admin-game-list__delete')).toBeNull();
  });

  it('asks to delete the chosen game, labelled for screen readers', () => {
    const fixture = render({ showDelete: true });
    const requested: AdminGameSummary[] = [];
    fixture.componentInstance.deleteRequested.subscribe((game) => requested.push(game));
    const secondDelete = fixture.nativeElement.querySelectorAll('.admin-game-list__delete')[1];

    secondDelete.click();

    expect(secondDelete.getAttribute('aria-label')).toBe('Delete The Legend of Zelda');
    expect(requested).toEqual([APPROVED_GAME_SUMMARY]);
  });
});
