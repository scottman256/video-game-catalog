import { TestBed } from '@angular/core/testing';

import { StarScore } from './star-score';

describe('StarScore', () => {
  it('renders N/A when score is null', () => {
    const fixture = TestBed.createComponent(StarScore);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('N/A');
  });

  it('renders the numeric score when present', () => {
    const fixture = TestBed.createComponent(StarScore);
    fixture.componentRef.setInput('score', 4.5);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('4.5');
  });

  it('renders five stars', () => {
    const fixture = TestBed.createComponent(StarScore);
    fixture.componentRef.setInput('score', 3);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.star').length).toBe(5);
  });
});
