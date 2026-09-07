import { TestBed } from '@angular/core/testing';

import { ImageModal } from './image-modal';

describe('ImageModal', () => {
  it('renders nothing when there is no image url', () => {
    const fixture = TestBed.createComponent(ImageModal);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.modal-backdrop')).toBeNull();
  });

  it('renders the image when a url is provided', () => {
    const fixture = TestBed.createComponent(ImageModal);
    fixture.componentRef.setInput('imageUrl', 'shot.png');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.modal-image').src).toContain('shot.png');
  });

  it('emits closed when the backdrop is clicked', () => {
    const fixture = TestBed.createComponent(ImageModal);
    fixture.componentRef.setInput('imageUrl', 'shot.png');
    fixture.detectChanges();
    let closed = false;
    fixture.componentInstance.closed.subscribe(() => (closed = true));

    fixture.nativeElement.querySelector('.modal-backdrop').click();

    expect(closed).toBe(true);
  });
});
