import { SourceRect } from './crop-geometry';

export function cropToBlob(image: HTMLImageElement, rect: SourceRect, outputSize: number): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = outputSize;
  canvas.height = outputSize;
  const context = canvas.getContext('2d');
  if (!context) return Promise.reject(new Error('Image cropping is not supported in this browser'));
  context.drawImage(image, rect.sx, rect.sy, rect.size, rect.size, 0, 0, outputSize, outputSize);
  return toBlob(canvas);
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not process the cropped image'))),
      'image/png',
    );
  });
}
