import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImageModal } from './image-modal';

describe('ImageModal', () => {
  function render(imageUrl: string | null): ComponentFixture<ImageModal> {
    const fixture = TestBed.createComponent(ImageModal);
    fixture.componentRef.setInput('imageUrl', imageUrl);
    fixture.detectChanges();
    return fixture;
  }

  function closedCount(fixture: ComponentFixture<ImageModal>): () => number {
    let count = 0;
    fixture.componentInstance.closed.subscribe(() => count++);
    return () => count;
  }

  it('renders nothing when there is no image url', () => {
    expect(render(null).nativeElement.querySelector('.modal-backdrop')).toBeNull();
  });

  it('renders the image when a url is provided', () => {
    expect(render('shot.png').nativeElement.querySelector('.modal-image').src).toContain(
      'shot.png',
    );
  });

  it('emits closed when the backdrop is clicked', () => {
    const fixture = render('shot.png');
    const closed = closedCount(fixture);

    fixture.nativeElement.querySelector('.modal-backdrop').click();

    expect(closed()).toBe(1);
  });

  it('emits closed from the close button', () => {
    const fixture = render('shot.png');
    const closed = closedCount(fixture);

    fixture.nativeElement.querySelector('.modal-close').click();

    expect(closed()).toBeGreaterThan(0);
  });

  it('emits closed when Escape is pressed', () => {
    const fixture = render('shot.png');
    const closed = closedCount(fixture);

    fixture.nativeElement
      .querySelector('.modal-backdrop')
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(closed()).toBe(1);
  });
});
