import { clampOffset, computeSourceRect, coverScale, maxOffset } from './crop-geometry';

describe('crop geometry', () => {
  describe('coverScale', () => {
    it('scales a wide image by its height so it still covers the viewport', () => {
      expect(coverScale(400, 200, 100)).toBe(0.5);
    });

    it('scales a tall image by its width', () => {
      expect(coverScale(200, 400, 100)).toBe(0.5);
    });

    it('scales a small image up so it never leaves a gap', () => {
      expect(coverScale(50, 50, 100)).toBe(2);
    });

    it('falls back to 1 before the image has loaded', () => {
      expect(coverScale(0, 0, 100)).toBe(1);
    });
  });

  describe('maxOffset', () => {
    it('allows dragging by the overflow on each side', () => {
      // 400px wide at scale 0.5 = 200px displayed, 100px viewport -> 50px overflow each side
      expect(maxOffset(400, 0.5, 100)).toBe(50);
    });

    it('allows no dragging when the image exactly fits', () => {
      expect(maxOffset(200, 0.5, 100)).toBe(0);
    });

    it('never returns a negative limit', () => {
      expect(maxOffset(100, 0.5, 100)).toBe(0);
    });
  });

  describe('clampOffset', () => {
    it('keeps an offset within the limit', () => {
      expect(clampOffset(20, 50)).toBe(20);
    });

    it('clamps past the positive limit', () => {
      expect(clampOffset(80, 50)).toBe(50);
    });

    it('clamps past the negative limit', () => {
      expect(clampOffset(-80, 50)).toBe(-50);
    });
  });

  describe('computeSourceRect', () => {
    it('selects the centred square of a square image at minimum zoom', () => {
      const rect = computeSourceRect({
        naturalWidth: 200,
        naturalHeight: 200,
        viewportSize: 100,
        zoom: 1,
        offsetX: 0,
        offsetY: 0,
      });

      expect(rect).toEqual({ sx: 0, sy: 0, size: 200 });
    });

    it('selects the centred square of a wide image, trimming the sides', () => {
      const rect = computeSourceRect({
        naturalWidth: 400,
        naturalHeight: 200,
        viewportSize: 100,
        zoom: 1,
        offsetX: 0,
        offsetY: 0,
      });

      expect(rect.size).toBe(200);
      expect(rect.sx).toBe(100);
      expect(rect.sy).toBe(0);
    });

    it('takes a smaller region of the image as the user zooms in', () => {
      const zoomedOut = computeSourceRect({
        naturalWidth: 200,
        naturalHeight: 200,
        viewportSize: 100,
        zoom: 1,
        offsetX: 0,
        offsetY: 0,
      });
      const zoomedIn = computeSourceRect({
        naturalWidth: 200,
        naturalHeight: 200,
        viewportSize: 100,
        zoom: 2,
        offsetX: 0,
        offsetY: 0,
      });

      expect(zoomedIn.size).toBe(zoomedOut.size / 2);
      expect(zoomedIn.sx).toBe(50);
      expect(zoomedIn.sy).toBe(50);
    });

    it('shifts the region opposite to the drag direction', () => {
      const rect = computeSourceRect({
        naturalWidth: 400,
        naturalHeight: 200,
        viewportSize: 100,
        zoom: 1,
        offsetX: 25,
        offsetY: 0,
      });

      // dragging the image right reveals more of its left-hand side
      expect(rect.sx).toBe(50);
    });
  });
});
