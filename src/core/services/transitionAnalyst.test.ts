/**
 * Transition Analyst Unit Tests
 * Tests for intelligent transition recommendations based on frame analysis
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { analyzeCut } from './transitionAnalyst';

// Mock ImageData for Node.js environment
class MockImageData {
  width: number;
  height: number;
  data: Uint8ClampedArray;

  constructor(data: Uint8ClampedArray, width: number, height: number) {
    this.width = width;
    this.height = height;
    this.data = data;
  }
}

// @ts-expect-error - Polyfill ImageData for tests
global.ImageData = MockImageData;

describe('transitionAnalyst', () => {
  beforeEach(() => {
    // Ensure ImageData is available
    // @ts-expect-error - Polyfill ImageData for tests
    if (!global.ImageData) {
      // @ts-expect-error - Polyfill ImageData for tests
      global.ImageData = MockImageData;
    }
  });

  /**
   * Helper function to create ImageData with uniform color
   */
  const createImageData = (
    r: number,
    g: number,
    b: number,
    width = 100,
    height = 100,
  ): ImageData => {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255; // Alpha
    }
    return new ImageData(data, width, height);
  };

  describe('analyzeCut', () => {
    it('should recommend cut for very similar frames', () => {
      const frame1 = createImageData(100, 150, 200);
      const frame2 = createImageData(105, 155, 205);

      const result = analyzeCut(frame1, frame2);

      expect(result.type).toBe('cut');
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.reason).toContain('continuity');
      expect(result.scores.colorDiff).toBeLessThan(15);
    });

    it('should recommend fade_black for high brightness difference', () => {
      const darkFrame = createImageData(10, 10, 10);
      const brightFrame = createImageData(245, 245, 245);

      const result = analyzeCut(darkFrame, brightFrame);

      expect(result.type).toBe('fade_black');
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.reason).toContain('contrast');
      expect(result.scores.lumaDiff).toBeGreaterThan(45);
    });

    it('should recommend dissolve for moderate color differences', () => {
      const blueFrame = createImageData(50, 50, 200);
      const redFrame = createImageData(200, 50, 50);

      const result = analyzeCut(blueFrame, redFrame);

      expect(result.type).toBe('dissolve');
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.reason).toContain('change');
      expect(result.scores.colorDiff).toBeGreaterThan(15);
    });

    it('should calculate color difference correctly', () => {
      const frame1 = createImageData(0, 0, 0);
      const frame2 = createImageData(255, 255, 255);

      const result = analyzeCut(frame1, frame2);

      // Max color distance in RGB space
      expect(result.scores.colorDiff).toBeGreaterThan(90);
    });

    it('should calculate luma difference correctly', () => {
      const blackFrame = createImageData(0, 0, 0);
      const whiteFrame = createImageData(255, 255, 255);

      const result = analyzeCut(blackFrame, whiteFrame);

      expect(result.scores.lumaDiff).toBeCloseTo(100, 0);
    });

    it('should handle identical frames', () => {
      const frame1 = createImageData(128, 128, 128);
      const frame2 = createImageData(128, 128, 128);

      const result = analyzeCut(frame1, frame2);

      expect(result.type).toBe('cut');
      expect(result.scores.colorDiff).toBe(0);
      expect(result.scores.lumaDiff).toBe(0);
    });

    it('should prioritize luma over color for flash cuts', () => {
      // Similar colors but very different brightness
      const darkGray = createImageData(50, 50, 50);
      const lightGray = createImageData(200, 200, 200);

      const result = analyzeCut(darkGray, lightGray);

      expect(result.type).toBe('fade_black');
      expect(result.scores.lumaDiff).toBeGreaterThan(45);
    });

    it('should handle red channel differences', () => {
      const frame1 = createImageData(0, 100, 100);
      const frame2 = createImageData(255, 100, 100);

      const result = analyzeCut(frame1, frame2);

      expect(result.scores.colorDiff).toBeGreaterThan(0);
      expect(result.type).toBe('dissolve');
    });

    it('should handle green channel differences', () => {
      const frame1 = createImageData(100, 50, 100);
      const frame2 = createImageData(100, 180, 100);

      const result = analyzeCut(frame1, frame2);

      expect(result.scores.colorDiff).toBeGreaterThan(0);
      expect(result.type).toBe('dissolve');
    });

    it('should handle blue channel differences', () => {
      const frame1 = createImageData(100, 100, 0);
      const frame2 = createImageData(100, 100, 255);

      const result = analyzeCut(frame1, frame2);

      expect(result.scores.colorDiff).toBeGreaterThan(0);
      expect(result.type).toBe('dissolve');
    });

    it('should return recommendation with all required properties', () => {
      const frame1 = createImageData(100, 100, 100);
      const frame2 = createImageData(150, 150, 150);

      const result = analyzeCut(frame1, frame2);

      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('reason');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('scores');
      expect(result.scores).toHaveProperty('colorDiff');
      expect(result.scores).toHaveProperty('lumaDiff');
      expect(typeof result.confidence).toBe('number');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should handle different image dimensions', () => {
      const smallFrame = createImageData(100, 100, 100, 50, 50);
      const largeFrame = createImageData(150, 150, 150, 200, 200);

      const result = analyzeCut(smallFrame, largeFrame);

      expect(result).toHaveProperty('type');
      expect(result.scores.colorDiff).toBeGreaterThan(0);
    });
  });
});
