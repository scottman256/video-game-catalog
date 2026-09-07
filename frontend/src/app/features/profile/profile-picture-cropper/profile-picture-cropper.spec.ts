import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfilePictureCropper } from './profile-picture-cropper';

const CROPPED_BLOB = new Blob(['cropped'], { type: 'image/png' });

/** jsdom has no canvas implementation, so stub the two calls the cropper makes. */
function stubCanvas(succeeds = true): void {
  HTMLCanvasElement.prototype.getContext = (() =>
    succeeds ? ({ drawImage: () => undefined } as unknown as CanvasRenderingContext2D) : null) as never;
  HTMLCanvasElement.prototype.toBlob = function (callback: BlobCallback) {
    callback(CROPPED_BLOB);
  } as never;
}

function loadImage(fixture: ComponentFixture<ProfilePictureCropper>, width = 400, height = 200): void {
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

    expect(fixture.componentInstance['zoom']()).toBe(1);
    expect(fixture.componentInstance['offsetX']()).toBe(0);
    expect(fixture.componentInstance['offsetY']()).toBe(0);
  });

  it('sizes the image to cover the circular viewport', () => {
    const fixture = openWithFile();
    loadImage(fixture, 400, 200);

    // 200px tall scaled to the 260px viewport => scale 1.3 => 520x260
    expect(fixture.componentInstance['displayWidth']()).toBe(520);
    expect(fixture.componentInstance['displayHeight']()).toBe(260);
  });

  it('zooms via the slider', () => {
    const fixture = openWithFile();
    loadImage(fixture);

    fixture.componentInstance.setZoom(2);

    expect(fixture.componentInstance['zoom']()).toBe(2);
    expect(fixture.componentInstance['displayHeight']()).toBe(520);
  });

  it('repositions the image when dragged', () => {
    const fixture = openWithFile();
    loadImage(fixture, 400, 200);

    fixture.componentInstance.startDrag({ clientX: 0, clientY: 0, pointerId: 1, target: {} } as never);
    fixture.componentInstance.drag({ clientX: 40, clientY: 0, pointerId: 1 } as never);

    expect(fixture.componentInstance['offsetX']()).toBe(40);
  });

  it('does not let the image be dragged past its edge', () => {
    const fixture = openWithFile();
    loadImage(fixture, 400, 200);

    fixture.componentInstance.startDrag({ clientX: 0, clientY: 0, pointerId: 1, target: {} } as never);
    fixture.componentInstance.drag({ clientX: 9999, clientY: 9999, pointerId: 1 } as never);

    // 520px wide image in a 260px viewport => 130px of slack each side, and none vertically
    expect(fixture.componentInstance['offsetX']()).toBe(130);
    expect(fixture.componentInstance['offsetY']()).toBe(0);
  });

  it('ignores pointer movement that is not part of a drag', () => {
    const fixture = openWithFile();
    loadImage(fixture);

    fixture.componentInstance.drag({ clientX: 40, clientY: 40, pointerId: 1 } as never);

    expect(fixture.componentInstance['offsetX']()).toBe(0);
  });

  it('re-clamps the position when zooming back out', () => {
    const fixture = openWithFile();
    loadImage(fixture, 400, 200);
    fixture.componentInstance.setZoom(2);
    fixture.componentInstance.startDrag({ clientX: 0, clientY: 0, pointerId: 1, target: {} } as never);
    fixture.componentInstance.drag({ clientX: 9999, clientY: 9999, pointerId: 1 } as never);

    fixture.componentInstance.setZoom(1);

    expect(fixture.componentInstance['offsetX']()).toBe(130);
    expect(fixture.componentInstance['offsetY']()).toBe(0);
  });

  it('emits the cropped image on save', async () => {
    const fixture = openWithFile();
    loadImage(fixture);
    let emitted: Blob | undefined;
    fixture.componentInstance.cropped.subscribe((blob) => (emitted = blob));

    fixture.componentInstance.save();
    await Promise.resolve();

    expect(emitted).toBe(CROPPED_BLOB);
    expect(fixture.componentInstance['processing']()).toBe(false);
  });

  it('reports a friendly error when the browser cannot crop', async () => {
    stubCanvas(false);
    const fixture = openWithFile();
    loadImage(fixture);

    fixture.componentInstance.save();
    await Promise.resolve();
    await Promise.resolve();

    expect(fixture.componentInstance['errorMessage']()).toContain('Could not crop that image');
    expect(fixture.componentInstance['processing']()).toBe(false);
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

    fixture.nativeElement.querySelector('.cropper__actions .btn-secondary').click();

    expect(cancelled).toBe(true);
  });
});
