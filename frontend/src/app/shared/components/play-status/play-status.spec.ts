import { TestBed } from '@angular/core/testing';

import { PlayStatus } from './play-status';

describe('PlayStatus', () => {
  function render(completedOn: string | null, fullyCompletedOn: string | null, hoursPlayed: string | null) {
    const fixture = TestBed.createComponent(PlayStatus);
    fixture.componentRef.setInput('completedOn', completedOn);
    fixture.componentRef.setInput('fullyCompletedOn', fullyCompletedOn);
    fixture.componentRef.setInput('hoursPlayed', hoursPlayed);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('renders nothing for a game with no progress', () => {
    expect(render(null, null, null).textContent!.trim()).toBe('');
  });

  it('shows a Completed badge with the date on hover', () => {
    const badge = render('2026-09-01', null, null).querySelector('.status-badge--completed')!;

    expect(badge.textContent).toContain('Completed');
    expect(badge.getAttribute('title')).toBe('Completed Sep 1, 2026');
  });

  it('shows only the 100% badge once the game is fully completed', () => {
    const element = render('2026-09-01', '2026-09-20', null);

    expect(element.querySelector('.status-badge--fully-completed')!.getAttribute('title')).toBe(
      '100% completed Sep 20, 2026',
    );
    expect(element.querySelector('.status-badge--completed')).toBeNull();
  });

  it('shows hours played without trailing zeros', () => {
    expect(render(null, null, '12.0').querySelector('.hours-played')!.textContent).toBe('12 hrs played');
    expect(render(null, null, '12.5').querySelector('.hours-played')!.textContent).toBe('12.5 hrs played');
  });

  it('uses the singular for exactly one hour', () => {
    expect(render(null, null, '1.0').querySelector('.hours-played')!.textContent).toBe('1 hr played');
  });
});
