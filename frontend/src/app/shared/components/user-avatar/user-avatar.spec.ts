import { TestBed } from '@angular/core/testing';

import { UserAvatar } from './user-avatar';

describe('UserAvatar', () => {
  it('renders the picture when a url is provided', () => {
    const fixture = TestBed.createComponent(UserAvatar);
    fixture.componentRef.setInput('imageUrl', 'avatar.png');
    fixture.componentRef.setInput('username', 'scott');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.avatar__image').src).toContain('avatar.png');
  });

  it('falls back to the username initial when there is no picture', () => {
    const fixture = TestBed.createComponent(UserAvatar);
    fixture.componentRef.setInput('username', 'scott');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.avatar__initial').textContent.trim()).toBe('S');
    expect(fixture.nativeElement.querySelector('.avatar__image')).toBeNull();
  });

  it('falls back to a placeholder when there is no username either', () => {
    const fixture = TestBed.createComponent(UserAvatar);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.avatar__initial').textContent.trim()).toBe('?');
  });

  it('applies the large modifier when requested', () => {
    const fixture = TestBed.createComponent(UserAvatar);
    fixture.componentRef.setInput('large', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.avatar').classList).toContain('avatar--large');
  });
});
