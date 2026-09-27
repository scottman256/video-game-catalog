import { TestBed } from '@angular/core/testing';

import { PendingBadge } from './pending-badge';

describe('PendingBadge', () => {
  it('tells the submitter the game is waiting on an admin', () => {
    const fixture = TestBed.createComponent(PendingBadge);
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('.pending-badge') as HTMLElement;
    expect(badge.textContent?.trim()).toBe('Pending Admin Approval');
    expect(badge.title).toContain('until an admin approves it');
  });
});
