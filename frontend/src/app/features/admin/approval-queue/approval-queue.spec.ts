import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';

import { AdminGameSummary } from '../../../core/models/admin.model';
import { AdminService } from '../../../core/services/admin';
import { PENDING_GAME_SUMMARY } from '../../../testing/admin-fixtures';
import { ApprovalQueue } from './approval-queue';

describe('ApprovalQueue', () => {
  let pendingResult: Observable<AdminGameSummary[]>;

  beforeEach(() => {
    pendingResult = of([PENDING_GAME_SUMMARY]);
    TestBed.configureTestingModule({
      imports: [ApprovalQueue],
      providers: [provideRouter([]), { provide: AdminService, useValue: { listPendingGames: () => pendingResult } }],
    });
  });

  function render(): HTMLElement {
    const fixture = TestBed.createComponent(ApprovalQueue);
    fixture.detectChanges();
    return fixture.nativeElement;
  }

  it('lists games waiting for approval with a Review action', () => {
    const element = render();

    expect(element.textContent).toContain('Super Mario Bros');
    expect(element.querySelector('.admin-game-list__action')?.textContent?.trim()).toBe('Review');
  });

  it('says the queue is empty when nothing is waiting', () => {
    pendingResult = of([]);

    expect(render().textContent).toContain('No games are waiting for approval.');
  });

  it('shows an error when the queue cannot load', () => {
    pendingResult = throwError(() => new Error('down'));

    expect(render().textContent).toContain('Could not load the approval queue.');
  });
});
