import { describe, it, expect } from 'vitest';
import { calculateCameraTransform } from './cameraPhysics';
import type { CameraEffect } from '@core/types';

describe('calculateCameraTransform', () => {
  it('should return identity-ish transform for static type', () => {
    const effect: CameraEffect = { type: 'static', intensity: 0.5, scale: 1 };
    const result = calculateCameraTransform(effect, 0, 5);
    // Static has no case so falls through — transform has defaults
    expect(result).toContain('scale(1)');
    expect(result).toContain('translate(0%, 0%)');
    expect(result).toContain('rotate(0deg)');
  });

  it('should produce non-zero translation for handheld', () => {
    const effect: CameraEffect = { type: 'handheld', intensity: 0.5, scale: 1 };
    const result = calculateCameraTransform(effect, 1.0, 5);
    expect(result).toContain('scale(1)');
    // Should have non-zero x, y, rot due to noise
    expect(result).toMatch(/translate\(-?\d+(\.\d+)?%, -?\d+(\.\d+)?%\)/);
    expect(result).toMatch(/rotate\(-?\d+(\.\d+)?deg\)/);
  });

  it('should produce larger translation for higher handheld intensity', () => {
    const lowIntensity: CameraEffect = { type: 'handheld', intensity: 0.1, scale: 1 };
    const highIntensity: CameraEffect = { type: 'handheld', intensity: 1.0, scale: 1 };

    const low = calculateCameraTransform(lowIntensity, 1.0, 5);
    const high = calculateCameraTransform(highIntensity, 1.0, 5);

    // Extract x translation values
    const extractX = (s: string) => {
      const m = s.match(/translate\((-?\d+\.?\d*)%/);
      return m ? Math.abs(parseFloat(m[1])) : 0;
    };

    // High intensity should generally produce larger max amplitude
    // We test at multiple times and compare max values
    let maxLow = 0;
    let maxHigh = 0;
    for (let t = 0; t < 5; t += 0.1) {
      maxLow = Math.max(maxLow, extractX(calculateCameraTransform(lowIntensity, t, 5)));
      maxHigh = Math.max(maxHigh, extractX(calculateCameraTransform(highIntensity, t, 5)));
    }
    expect(maxHigh).toBeGreaterThan(maxLow);
  });

  it('should produce drift movement', () => {
    const effect: CameraEffect = { type: 'drift', intensity: 0.5, scale: 1 };
    const result = calculateCameraTransform(effect, 2.0, 5);
    expect(result).toContain('scale(1)');
    expect(result).toMatch(/translate\(-?\d+(\.\d+)?%, -?\d+(\.\d+)?%\)/);
    // Drift has no rotation
    expect(result).toContain('rotate(0deg)');
  });

  it('should zoom in over time', () => {
    const effect: CameraEffect = { type: 'zoom_in', intensity: 1.0, scale: 1 };
    const start = calculateCameraTransform(effect, 0, 5);
    const end = calculateCameraTransform(effect, 5, 5);

    const extractScale = (s: string) => {
      const m = s.match(/scale\((\d+\.?\d*)\)/);
      return m ? parseFloat(m[1]) : 1;
    };

    expect(extractScale(end)).toBeGreaterThan(extractScale(start));
    expect(extractScale(start)).toBeCloseTo(1, 1);
    expect(extractScale(end)).toBeCloseTo(1.5, 1); // 1 + 0.5 * 1.0
  });

  it('should zoom out over time', () => {
    const effect: CameraEffect = { type: 'zoom_out', intensity: 1.0, scale: 1 };
    const start = calculateCameraTransform(effect, 0, 5);
    const end = calculateCameraTransform(effect, 5, 5);

    const extractScale = (s: string) => {
      const m = s.match(/scale\((\d+\.?\d*)\)/);
      return m ? parseFloat(m[1]) : 1;
    };

    expect(extractScale(start)).toBeGreaterThan(extractScale(end));
    expect(extractScale(start)).toBeCloseTo(1.5, 1); // starts zoomed
    expect(extractScale(end)).toBeCloseTo(1.0, 1);
  });

  it('should clamp zoom progress at 1', () => {
    const effect: CameraEffect = { type: 'zoom_in', intensity: 0.5, scale: 1 };
    // Time exceeds duration
    const result = calculateCameraTransform(effect, 10, 5);
    const extractScale = (s: string) => {
      const m = s.match(/scale\((\d+\.?\d*)\)/);
      return m ? parseFloat(m[1]) : 1;
    };
    // At progress=1.0: scale = 1 + 0.5*0.5 = 1.25
    expect(extractScale(result)).toBeCloseTo(1.25, 2);
  });

  it('should use default scale of 1 when not provided', () => {
    const effect: CameraEffect = { type: 'zoom_in', intensity: 1.0 };
    const result = calculateCameraTransform(effect, 0, 5);
    const extractScale = (s: string) => {
      const m = s.match(/scale\((\d+\.?\d*)\)/);
      return m ? parseFloat(m[1]) : 0;
    };
    expect(extractScale(result)).toBeCloseTo(1.0, 2);
  });

  it('should handle zero intensity (no movement)', () => {
    const effect: CameraEffect = { type: 'handheld', intensity: 0, scale: 1 };
    const result = calculateCameraTransform(effect, 1, 5);
    // With 0 intensity, amplitudes multiply to 0
    expect(result).toContain('translate(0%, 0%)');
    expect(result).toContain('rotate(0deg)');
  });

  it('should return correct CSS transform string format', () => {
    const effect: CameraEffect = { type: 'static', intensity: 0.5, scale: 2 };
    const result = calculateCameraTransform(effect, 0, 5);
    expect(result).toMatch(/^scale\(.+\) translate\(.+%, .+%\) rotate\(.+deg\)$/);
  });
});
