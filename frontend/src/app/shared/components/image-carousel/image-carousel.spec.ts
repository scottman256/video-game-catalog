import { TestBed } from '@angular/core/testing';

import { ImageCarousel } from './image-carousel';

describe('ImageCarousel', () => {
  it('shows a placeholder when there are no images', () => {
    const fixture = TestBed.createComponent(ImageCarousel);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No screenshots');
  });

  it('cycles to the next image', () => {
    const fixture = TestBed.createComponent(ImageCarousel);
    fixture.componentRef.setInput('images', ['a.png', 'b.png']);
    fixture.detectChanges();

    fixture.componentInstance.next();

    expect(fixture.componentInstance['activeIndex']()).toBe(1);
  });

  it('emits imageClick with the active image url', () => {
    const fixture = TestBed.createComponent(ImageCarousel);
    fixture.componentRef.setInput('images', ['a.png']);
    fixture.detectChanges();
    let clicked: string | undefined;
    fixture.componentInstance.imageClick.subscribe((url) => (clicked = url));

    fixture.nativeElement.querySelector('.carousel__image-button').click();

    expect(clicked).toBe('a.png');
  });
});
