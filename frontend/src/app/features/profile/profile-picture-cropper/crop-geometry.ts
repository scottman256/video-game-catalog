export interface CropInput {
  naturalWidth: number;
  naturalHeight: number;
  viewportSize: number;
  zoom: number;
  offsetX: number;
  offsetY: number;
}

export interface SourceRect {
  sx: number;
  sy: number;
  size: number;
}

/** Smallest scale at which the image still covers the whole viewport. */
export function coverScale(naturalWidth: number, naturalHeight: number, viewportSize: number): number {
  if (naturalWidth <= 0 || naturalHeight <= 0) return 1;
  return Math.max(viewportSize / naturalWidth, viewportSize / naturalHeight);
}

/** How far the image may be dragged before a gap would appear inside the viewport. */
export function maxOffset(naturalLength: number, scale: number, viewportSize: number): number {
  return Math.max(0, (naturalLength * scale - viewportSize) / 2);
}

export function clampOffset(offset: number, limit: number): number {
  return Math.min(limit, Math.max(-limit, offset));
}

/** The square region of the original image that the viewport is currently showing. */
export function computeSourceRect(input: CropInput): SourceRect {
  const scale = coverScale(input.naturalWidth, input.naturalHeight, input.viewportSize) * input.zoom;
  const left = (input.viewportSize - input.naturalWidth * scale) / 2 + input.offsetX;
  const top = (input.viewportSize - input.naturalHeight * scale) / 2 + input.offsetY;
  return { sx: withoutNegativeZero(-left / scale), sy: withoutNegativeZero(-top / scale), size: input.viewportSize / scale };
}

function withoutNegativeZero(value: number): number {
  return value === 0 ? 0 : value;
}
