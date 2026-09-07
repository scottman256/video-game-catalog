import { TestBed } from '@angular/core/testing';

import { FieldError } from './field-error';

describe('FieldError', () => {
  it('renders nothing when there is no message', () => {
    const fixture = TestBed.createComponent(FieldError);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.field-error')).toBeNull();
  });

  it('renders the message when provided', () => {
    const fixture = TestBed.createComponent(FieldError);
    fixture.componentRef.setInput('message', 'Username is taken');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Username is taken');
  });
});
