import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImageCarousel } from './image-carousel';

describe('ImageCarousel', () => {
  function render(images: string[]): ComponentFixture<ImageCarousel> {
    const fixture = TestBed.createComponent(ImageCarousel);
    fixture.componentRef.setInput('images', images);
    fixture.detectChanges();
    return fixture;
  }

  function click(fixture: ComponentFixture<ImageCarousel>, ariaLabel: string): void {
    fixture.nativeElement.querySelector(`[aria-label="${ariaLabel}"]`).click();
    fixture.detectChanges();
  }

  function shownImage(fixture: ComponentFixture<ImageCarousel>): string {
    return fixture.nativeElement.querySelector('.carousel__image').getAttribute('src');
  }

  it('shows a placeholder when there are no images', () => {
    expect(render([]).nativeElement.textContent).toContain('No screenshots');
  });

  it('cycles forward and wraps back to the first image', () => {
    const fixture = render(['a.png', 'b.png']);

    click(fixture, 'Next screenshot');
    expect(shownImage(fixture)).toBe('b.png');

    click(fixture, 'Next screenshot');
    expect(shownImage(fixture)).toBe('a.png');
  });

  it('cycles backward from the first image to the last', () => {
    const fixture = render(['a.png', 'b.png', 'c.png']);

    click(fixture, 'Previous screenshot');

    expect(shownImage(fixture)).toBe('c.png');
  });

  it('jumps to an image from its dot and marks that dot active', () => {
    const fixture = render(['a.png', 'b.png', 'c.png']);

    click(fixture, 'Go to screenshot 3');

    expect(shownImage(fixture)).toBe('c.png');
    expect(
      fixture.nativeElement.querySelector('.carousel__dot--active').getAttribute('aria-label'),
    ).toBe('Go to screenshot 3');
  });

  it('emits imageClick with the active image url', () => {
    const fixture = render(['a.png', 'b.png']);
    let clicked: string | undefined;
    fixture.componentInstance.imageClick.subscribe((url) => (clicked = url));
    click(fixture, 'Next screenshot');

    click(fixture, 'View full-size screenshot');

    expect(clicked).toBe('b.png');
  });

  it('ignores navigation when there are no images, instead of producing an invalid index', () => {
    const fixture = render([]);

    fixture.componentInstance.next();
    fixture.componentInstance.previous();
    fixture.componentRef.setInput('images', ['a.png']);
    fixture.detectChanges();

    expect(shownImage(fixture)).toBe('a.png');
  });
});
