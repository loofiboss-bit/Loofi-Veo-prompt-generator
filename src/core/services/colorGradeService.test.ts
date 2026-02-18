/**
 * Color Grade Service Unit Tests
 * Tests for color matching and CSS filter calculation
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { calculateColorMatch } from './colorGradeService';

// Setup global ImageData constructor for jsdom
beforeAll(() => {
  if (typeof global.ImageData === 'undefined') {
    // Create a simple ImageData polyfill for testing
    class ImageDataPolyfill {
      public data: Uint8ClampedArray;
      public width: number;
      public height: number;

      constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.data = new Uint8ClampedArray(width * height * 4);
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).ImageData = ImageDataPolyfill;
  }
});

describe('colorGradeService', () => {
  // Helper to create ImageData with specific pixel values
  const createImageData = (
    width: number,
    height: number,
    fillFn: (i: number) => [number, number, number, number],
  ): ImageData => {
    // Create ImageData directly (using polyfill in test environment)
    const imageData = new ImageData(width, height);

    for (let i = 0; i < imageData.data.length; i += 4) {
      const [r, g, b, a] = fillFn(i);
      imageData.data[i] = r;
      imageData.data[i + 1] = g;
      imageData.data[i + 2] = b;
      imageData.data[i + 3] = a;
    }

    return imageData;
  };

  // Create uniform colored image
  const createUniformImage = (
    width: number,
    height: number,
    r: number,
    g: number,
    b: number,
  ): ImageData => {
    return createImageData(width, height, () => [r, g, b, 255]);
  };

  describe('calculateColorMatch', () => {
    it('should return neutral values for identical images', () => {
      const image = createUniformImage(10, 10, 128, 128, 128);

      const result = calculateColorMatch(image, image);

      expect(result.brightness).toBeCloseTo(1.0, 2);
      expect(result.contrast).toBeCloseTo(1.0, 2);
      expect(result.saturation).toBe(1.0);
    });

    it('should increase brightness for darker target', () => {
      const bright = createUniformImage(10, 10, 200, 200, 200);
      const dark = createUniformImage(10, 10, 100, 100, 100);

      const result = calculateColorMatch(bright, dark);

      expect(result.brightness).toBeGreaterThan(1.0);
    });

    it('should decrease brightness for brighter target', () => {
      const dark = createUniformImage(10, 10, 100, 100, 100);
      const bright = createUniformImage(10, 10, 200, 200, 200);

      const result = calculateColorMatch(dark, bright);

      expect(result.brightness).toBeLessThan(1.0);
    });

    it('should calculate contrast ratio from variance', () => {
      // High contrast reference (mixed values)
      const mixedPixels = createImageData(10, 10, (i) => {
        const pixelIndex = i / 4;
        // Alternate between black and white for high variance
        return pixelIndex % 2 === 0 ? [0, 0, 0, 255] : [255, 255, 255, 255];
      });

      // Low contrast target (all uniform)
      const uniformPixels = createUniformImage(10, 10, 128, 128, 128);

      const result = calculateColorMatch(mixedPixels, uniformPixels);

      // When target has zero variance, contrast defaults to safe range
      expect(result.contrast).toBeGreaterThanOrEqual(0.5);
      expect(result.contrast).toBeLessThanOrEqual(2.0);
    });

    it('should add sepia for warm color temperature', () => {
      // Warm reference (more red than blue)
      const warm = createUniformImage(10, 10, 200, 150, 100);

      // Cool target (more blue than red)
      const cool = createUniformImage(10, 10, 100, 150, 200);

      const result = calculateColorMatch(warm, cool);

      expect(result.sepia).toBeGreaterThan(0);
    });

    it('should not add sepia for cool color temperature', () => {
      // Cool reference (more blue than red)
      const cool = createUniformImage(10, 10, 100, 150, 200);

      // Warm target (more red than blue)
      const warm = createUniformImage(10, 10, 200, 150, 100);

      const result = calculateColorMatch(cool, warm);

      expect(result.sepia).toBe(0);
    });

    it('should clamp brightness to safe range', () => {
      // Very bright reference
      const veryBright = createUniformImage(10, 10, 255, 255, 255);

      // Very dark target
      const veryDark = createUniformImage(10, 10, 10, 10, 10);

      const result = calculateColorMatch(veryBright, veryDark);

      // Should not exceed max safe value
      expect(result.brightness).toBeLessThanOrEqual(2.0);
      expect(result.brightness).toBeGreaterThanOrEqual(0.5);
    });

    it('should clamp contrast to safe range', () => {
      // Very high contrast reference
      const highContrast = createImageData(10, 10, (i) => {
        const pixelIndex = i / 4;
        return pixelIndex % 2 === 0 ? [0, 0, 0, 255] : [255, 255, 255, 255];
      });

      // Very low contrast target
      const lowContrast = createUniformImage(10, 10, 128, 128, 128);

      const result = calculateColorMatch(highContrast, lowContrast);

      // Should not exceed max safe value
      expect(result.contrast).toBeLessThanOrEqual(2.0);
      expect(result.contrast).toBeGreaterThanOrEqual(0.5);
    });

    it('should handle low luminance values without division by zero', () => {
      // Near-black reference
      const nearBlack = createUniformImage(10, 10, 1, 1, 1);

      // Near-black target
      const nearBlackTarget = createUniformImage(10, 10, 2, 2, 2);

      const result = calculateColorMatch(nearBlack, nearBlackTarget);

      // Should default to neutral brightness
      expect(result.brightness).toBe(1.0);
    });

    it('should return fixed precision for all values', () => {
      const ref = createUniformImage(10, 10, 180, 140, 120);
      const target = createUniformImage(10, 10, 120, 130, 140);

      const result = calculateColorMatch(ref, target);

      // Check that values have 2 decimal places max
      expect(result.brightness.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(2);
      expect(result.contrast.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(2);
      expect(result.saturation.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(2);
      expect(result.sepia.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(2);
    });

    it('should always set saturation to 1.0', () => {
      const ref = createUniformImage(10, 10, 200, 100, 50);
      const target = createUniformImage(10, 10, 50, 100, 200);

      const result = calculateColorMatch(ref, target);

      expect(result.saturation).toBe(1.0);
    });

    it('should always set hueRotate to 0', () => {
      const ref = createUniformImage(10, 10, 200, 100, 50);
      const target = createUniformImage(10, 10, 50, 100, 200);

      const result = calculateColorMatch(ref, target);

      expect(result.hueRotate).toBe(0);
    });

    it('should clamp sepia to maximum of 1.0', () => {
      // Extremely warm reference
      const extremeWarm = createUniformImage(10, 10, 255, 128, 0);

      // Cool target
      const cool = createUniformImage(10, 10, 0, 128, 255);

      const result = calculateColorMatch(extremeWarm, cool);

      expect(result.sepia).toBeLessThanOrEqual(1.0);
      expect(result.sepia).toBeGreaterThanOrEqual(0);
    });

    it('should handle different image sizes', () => {
      const ref5x5 = createUniformImage(5, 5, 150, 150, 150);
      const target10x10 = createUniformImage(10, 10, 100, 100, 100);

      const result = calculateColorMatch(ref5x5, target10x10);

      expect(result.brightness).toBeGreaterThan(1.0);
      expect(result.contrast).toBeCloseTo(1.0, 1);
    });
  });
});
