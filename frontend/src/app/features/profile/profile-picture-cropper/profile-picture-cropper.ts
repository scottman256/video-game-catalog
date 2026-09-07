import { Component, ElementRef, computed, effect, input, output, signal, viewChild } from '@angular/core';

import { clampOffset, computeSourceRect, coverScale, maxOffset } from './crop-geometry';
import { cropToBlob } from './crop-image';

const VIEWPORT_SIZE = 260;
const OUTPUT_SIZE = 512;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

interface DragStart {
  pointerX: number;
  pointerY: number;
  offsetX: number;
  offsetY: number;
}

@Component({
  selector: 'app-profile-picture-cropper',
  imports: [],
  templateUrl: './profile-picture-cropper.html',
  styleUrl: './profile-picture-cropper.scss',
})
export class ProfilePictureCropper {
  readonly file = input<File | null>(null);
  readonly cropped = output<Blob>();
  readonly cancelled = output<void>();

  protected readonly viewportSize = VIEWPORT_SIZE;
  protected readonly minZoom = MIN_ZOOM;
  protected readonly maxZoom = MAX_ZOOM;

  protected readonly imageUrl = signal<string | null>(null);
  protected readonly naturalWidth = signal(0);
  protected readonly naturalHeight = signal(0);
  protected readonly zoom = signal(MIN_ZOOM);
  protected readonly offsetX = signal(0);
  protected readonly offsetY = signal(0);
  protected readonly processing = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  private readonly imageRef = viewChild<ElementRef<HTMLImageElement>>('cropImage');
  private dragStart: DragStart | null = null;
  /** Held outside a signal so revoking the previous URL never re-triggers the loading effect. */
  private currentObjectUrl: string | null = null;

  protected readonly scale = computed(
    () => coverScale(this.naturalWidth(), this.naturalHeight(), VIEWPORT_SIZE) * this.zoom(),
  );
  protected readonly displayWidth = computed(() => this.naturalWidth() * this.scale());
  protected readonly displayHeight = computed(() => this.naturalHeight() * this.scale());
  protected readonly left = computed(() => (VIEWPORT_SIZE - this.displayWidth()) / 2 + this.offsetX());
  protected readonly top = computed(() => (VIEWPORT_SIZE - this.displayHeight()) / 2 + this.offsetY());

  constructor() {
    effect(() => this.loadFile(this.file()));
  }

  onImageLoad(event: Event): void {
    const image = event.target as HTMLImageElement;
    this.naturalWidth.set(image.naturalWidth);
    this.naturalHeight.set(image.naturalHeight);
    this.resetFraming();
  }

  setZoom(value: number): void {
    this.zoom.set(value);
    this.moveTo(this.offsetX(), this.offsetY());
  }

  startDrag(event: PointerEvent): void {
    this.dragStart = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      offsetX: this.offsetX(),
      offsetY: this.offsetY(),
    };
    (event.target as Element).setPointerCapture?.(event.pointerId);
  }

  drag(event: PointerEvent): void {
    const start = this.dragStart;
    if (!start) return;
    this.moveTo(
      start.offsetX + event.clientX - start.pointerX,
      start.offsetY + event.clientY - start.pointerY,
    );
  }

  endDrag(): void {
    this.dragStart = null;
  }

  save(): void {
    const image = this.imageRef()?.nativeElement;
    if (!image) return;
    this.processing.set(true);
    this.errorMessage.set(null);
    cropToBlob(image, this.sourceRect(), OUTPUT_SIZE)
      .then((blob) => this.emitCropped(blob))
      .catch(() => this.failWith('Could not crop that image. Please try a different one.'));
  }

  cancel(): void {
    this.cancelled.emit();
  }

  private sourceRect() {
    return computeSourceRect({
      naturalWidth: this.naturalWidth(),
      naturalHeight: this.naturalHeight(),
      viewportSize: VIEWPORT_SIZE,
      zoom: this.zoom(),
      offsetX: this.offsetX(),
      offsetY: this.offsetY(),
    });
  }

  private emitCropped(blob: Blob): void {
    this.processing.set(false);
    this.cropped.emit(blob);
  }

  private failWith(message: string): void {
    this.processing.set(false);
    this.errorMessage.set(message);
  }

  private moveTo(x: number, y: number): void {
    this.offsetX.set(clampOffset(x, maxOffset(this.naturalWidth(), this.scale(), VIEWPORT_SIZE)));
    this.offsetY.set(clampOffset(y, maxOffset(this.naturalHeight(), this.scale(), VIEWPORT_SIZE)));
  }

  private loadFile(file: File | null): void {
    if (this.currentObjectUrl) URL.revokeObjectURL(this.currentObjectUrl);
    this.currentObjectUrl = file ? URL.createObjectURL(file) : null;
    this.resetFraming();
    this.errorMessage.set(null);
    this.imageUrl.set(this.currentObjectUrl);
  }

  private resetFraming(): void {
    this.zoom.set(MIN_ZOOM);
    this.offsetX.set(0);
    this.offsetY.set(0);
  }
}
