import { ComponentFixture, TestBed } from '@angular/core/testing';

import { buttonWithText, enterValue } from '../../../testing/dom';
import { ProfilePictureCropper } from './profile-picture-cropper';

const CROPPED_BLOB = new Blob(['cropped'], { type: 'image/png' });

/** jsdom has no canvas implementation, so stub the two calls the cropper makes. */
function stubCanvas({
  hasContext = true,
  blob = CROPPED_BLOB as Blob | null,
  completes = true,
} = {}): void {
  HTMLCanvasElement.prototype.getContext = (() =>
    hasContext
      ? ({ drawImage: () => undefined } as unknown as CanvasRenderingContext2D)
      : null) as never;
  HTMLCanvasElement.prototype.toBlob = function (callback: BlobCallback) {
    if (completes) callback(blob);
  } as never;
}

function loadImage(
  fixture: ComponentFixture<ProfilePictureCropper>,
  width = 400,
  height = 200,
): void {
  const image = fixture.nativeElement.querySelector('.cropper__image') as HTMLImageElement;
  Object.defineProperty(image, 'naturalWidth', { value: width, configurable: true });
  Object.defineProperty(image, 'naturalHeight', { value: height, configurable: true });
  image.dispatchEvent(new Event('load'));
  fixture.detectChanges();
}

function openWithFile(): ComponentFixture<ProfilePictureCropper> {
  const fixture = TestBed.createComponent(ProfilePictureCropper);
  fixture.componentRef.setInput('file', new File(['image'], 'avatar.png', { type: 'image/png' }));
  fixture.detectChanges();
  return fixture;
}

/** jsdom lacks PointerEvent, but the cropper only reads the coordinates a MouseEvent also carries. */
function pointer(
  fixture: ComponentFixture<ProfilePictureCropper>,
  type: string,
  clientX = 0,
  clientY = 0,
): void {
  const viewport = fixture.nativeElement.querySelector('.cropper__viewport');
  viewport.dispatchEvent(new MouseEvent(type, { clientX, clientY, bubbles: true }));
  fixture.detectChanges();
}

function dragBy(fixture: ComponentFixture<ProfilePictureCropper>, x: number, y: number): void {
  pointer(fixture, 'pointerdown', 0, 0);
  pointer(fixture, 'pointermove', x, y);
}

function offsets(fixture: ComponentFixture<ProfilePictureCropper>): [number, number] {
  return [fixture.componentInstance['offsetX'](), fixture.componentInstance['offsetY']()];
}

function zoomTo(fixture: ComponentFixture<ProfilePictureCropper>, zoom: string): void {
  enterValue(fixture.nativeElement.querySelector('#crop-zoom'), zoom);
  fixture.detectChanges();
}

async function save(fixture: ComponentFixture<ProfilePictureCropper>): Promise<void> {
  buttonWithText(fixture.nativeElement, 'Save picture').click();
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('ProfilePictureCropper', () => {
  beforeEach(async () => {
    stubCanvas();
    URL.createObjectURL = (() => 'blob:fake-url') as never;
    URL.revokeObjectURL = (() => undefined) as never;
    await TestBed.configureTestingModule({ imports: [ProfilePictureCropper] }).compileComponents();
  });

  it('renders nothing until a file is provided', () => {
    const fixture = TestBed.createComponent(ProfilePictureCropper);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.cropper')).toBeNull();
  });

  it('opens with the selected image once a file is provided', () => {
    const fixture = openWithFile();

    expect(fixture.nativeElement.querySelector('.cropper')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.cropper__image').src).toContain('blob:fake-url');
  });

  it('starts fully zoomed out and centred', () => {
    const fixture = openWithFile();
    loadImage(fixture);

    expect(fixture.nativeElement.querySelector('#crop-zoom').value).toBe('1');
    expect(offsets(fixture)).toEqual([0, 0]);
  });

  it('sizes the image to cover the circular viewport', () => {
    const fixture = openWithFile();
    loadImage(fixture, 400, 200);

    // 200px tall scaled to the 260px viewport => scale 1.3 => 520x260
    const image = fixture.nativeElement.querySelector('.cropper__image');
    expect([image.style.width, image.style.height]).toEqual(['520px', '260px']);
  });

  it('zooms via the slider', () => {
    const fixture = openWithFile();
    loadImage(fixture);

    zoomTo(fixture, '2');

    expect(fixture.nativeElement.querySelector('.cropper__image').style.height).toBe('520px');
  });

  it('repositions the image when dragged', () => {
    const fixture = openWithFile();
    loadImage(fixture, 400, 200);

    dragBy(fixture, 40, 0);

    expect(offsets(fixture)).toEqual([40, 0]);
  });

  it('does not let the image be dragged past its edge', () => {
    const fixture = openWithFile();
    loadImage(fixture, 400, 200);

    dragBy(fixture, 9999, 9999);

    // 520px wide image in a 260px viewport => 130px of slack each side, and none vertically
    expect(offsets(fixture)).toEqual([130, 0]);
  });

  it('ignores pointer movement that is not part of a drag', () => {
    const fixture = openWithFile();
    loadImage(fixture);

    pointer(fixture, 'pointermove', 40, 40);

    expect(offsets(fixture)).toEqual([0, 0]);
  });

  it('stops dragging once the pointer is released or the gesture is cancelled', () => {
    const fixture = openWithFile();
    loadImage(fixture, 400, 200);

    dragBy(fixture, 40, 0);
    pointer(fixture, 'pointerup');
    pointer(fixture, 'pointermove', 100, 0);
    expect(offsets(fixture)).toEqual([40, 0]);

    pointer(fixture, 'pointerdown', 0, 0);
    pointer(fixture, 'pointercancel');
    pointer(fixture, 'pointermove', -100, 0);
    expect(offsets(fixture)).toEqual([40, 0]);
  });

  it('re-clamps the position when zooming back out', () => {
    const fixture = openWithFile();
    loadImage(fixture, 400, 200);
    zoomTo(fixture, '2');
    dragBy(fixture, 9999, 9999);

    zoomTo(fixture, '1');

    expect(offsets(fixture)).toEqual([130, 0]);
  });

  it('emits the cropped image on save', async () => {
    const fixture = openWithFile();
    loadImage(fixture);
    let emitted: Blob | undefined;
    fixture.componentInstance.cropped.subscribe((blob) => (emitted = blob));

    await save(fixture);

    expect(emitted).toBe(CROPPED_BLOB);
    expect(buttonWithText(fixture.nativeElement, 'Save picture').disabled).toBe(false);
  });

  it('shows that it is saving and blocks a second save while cropping', () => {
    stubCanvas({ completes: false });
    const fixture = openWithFile();
    loadImage(fixture);

    buttonWithText(fixture.nativeElement, 'Save picture').click();
    fixture.detectChanges();

    expect(buttonWithText(fixture.nativeElement, 'Saving…').disabled).toBe(true);
  });

  it('reports a friendly error when the browser cannot crop', async () => {
    stubCanvas({ hasContext: false });
    const fixture = openWithFile();
    loadImage(fixture);

    await save(fixture);

    expect(fixture.nativeElement.querySelector('.cropper__error').textContent).toContain(
      'Could not crop that image',
    );
    expect(buttonWithText(fixture.nativeElement, 'Save picture').disabled).toBe(false);
  });

  it('reports a friendly error when the cropped image cannot be produced', async () => {
    stubCanvas({ blob: null });
    const fixture = openWithFile();
    loadImage(fixture);

    await save(fixture);

    expect(fixture.nativeElement.querySelector('.cropper__error').textContent).toContain(
      'Could not crop that image',
    );
  });

  it('creates exactly one object url per file, without re-triggering itself', () => {
    const created: string[] = [];
    let next = 0;
    URL.createObjectURL = (() => `blob:url-${next++}`) as never;
    const revoked: string[] = [];
    URL.revokeObjectURL = ((url: string) => revoked.push(url)) as never;
    const fixture = TestBed.createComponent(ProfilePictureCropper);

    fixture.componentRef.setInput('file', new File(['a'], 'a.png', { type: 'image/png' }));
    fixture.detectChanges();
    created.push(fixture.componentInstance['imageUrl']()!);
    fixture.componentRef.setInput('file', new File(['b'], 'b.png', { type: 'image/png' }));
    fixture.detectChanges();
    created.push(fixture.componentInstance['imageUrl']()!);

    expect(created).toEqual(['blob:url-0', 'blob:url-1']);
    expect(revoked).toEqual(['blob:url-0']);
  });

  it('emits cancelled when the user backs out', () => {
    const fixture = openWithFile();
    let cancelled = false;
    fixture.componentInstance.cancelled.subscribe(() => (cancelled = true));

    buttonWithText(fixture.nativeElement, 'Cancel').click();

    expect(cancelled).toBe(true);
  });
});
