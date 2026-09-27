import { TestBed } from '@angular/core/testing';

import { Notice } from './notice';

describe('Notice', () => {
  function render(message: string | null) {
    const fixture = TestBed.createComponent(Notice);
    fixture.componentRef.setInput('message', message);
    fixture.detectChanges();
    return fixture;
  }

  it('shows the message with a labelled dismiss button', () => {
    const element: HTMLElement = render('“Pragmata” was deleted.').nativeElement;

    expect(element.querySelector('.notice__message')?.textContent).toBe('“Pragmata” was deleted.');
    expect(element.querySelector('.notice__dismiss')?.getAttribute('aria-label')).toBe('Dismiss notice');
  });

  it('asks to be dismissed when the X is clicked', () => {
    const fixture = render('Saved');
    let dismissed = false;
    fixture.componentInstance.dismissed.subscribe(() => (dismissed = true));

    fixture.nativeElement.querySelector('.notice__dismiss').click();

    expect(dismissed).toBe(true);
  });

  it('renders nothing visible without a message but keeps the live region for screen readers', () => {
    const element: HTMLElement = render(null).nativeElement;

    expect(element.querySelector('.notice')).toBeNull();
    expect(element.querySelector('output[aria-live="polite"]')).not.toBeNull();
  });
});
