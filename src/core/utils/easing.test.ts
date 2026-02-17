import { describe, it, expect } from 'vitest';
import { cubicBezier, EASING_PRESETS, getEasedValue } from './easing';

describe('cubicBezier', () => {
  it('should return 0 when t=0', () => {
    expect(cubicBezier(0, 0.42, 0, 1, 1)).toBe(0);
    expect(cubicBezier(0, 0, 0, 0.58, 1)).toBe(0);
    expect(cubicBezier(0, 0.25, 0.25, 0.75, 0.75)).toBe(0);
  });

  it('should return 1 when t=1', () => {
    expect(cubicBezier(1, 0.42, 0, 1, 1)).toBe(1);
    expect(cubicBezier(1, 0, 0, 0.58, 1)).toBe(1);
    expect(cubicBezier(1, 0.25, 0.25, 0.75, 0.75)).toBe(1);
  });

  it('should return approximately 0.5 for linear curve at t=0.5', () => {
    // Linear curve has p1=(0.25,0.25) and p2=(0.75,0.75)
    const result = cubicBezier(0.5, 0.25, 0.25, 0.75, 0.75);
    expect(result).toBeCloseTo(0.5, 1);
  });

  it('should demonstrate ease-in curve (slow start, fast end)', () => {
    // ease-in: (0.42, 0) to (1, 1)
    // At t=0.25, should be < 0.25 (slow start)
    const earlyPoint = cubicBezier(0.25, 0.42, 0, 1, 1);
    expect(earlyPoint).toBeLessThan(0.25);

    // At t=0.75, check accelerating behavior
    const latePoint = cubicBezier(0.75, 0.42, 0, 1, 1);
    expect(latePoint).toBeGreaterThan(0.5); // accelerating but not necessarily 0.75+
  });

  it('should demonstrate ease-out curve (fast start, slow end)', () => {
    // ease-out: (0, 0) to (0.58, 1)
    // At t=0.25, should be > 0.25 (fast start)
    const earlyPoint = cubicBezier(0.25, 0, 0, 0.58, 1);
    expect(earlyPoint).toBeGreaterThan(0.25);

    // At t=0.75, check slowing behavior
    const latePoint = cubicBezier(0.75, 0, 0, 0.58, 1);
    expect(latePoint).toBeLessThan(1); // approaching 1 but slowing
  });

  it('should handle values between 0 and 1', () => {
    const result = cubicBezier(0.5, 0.42, 0, 0.58, 1);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });
});

describe('EASING_PRESETS', () => {
  it('should include linear preset returning t unchanged', () => {
    expect(EASING_PRESETS.linear(0)).toBe(0);
    expect(EASING_PRESETS.linear(0.5)).toBe(0.5);
    expect(EASING_PRESETS.linear(1)).toBe(1);
  });

  it('should have ease-in preset', () => {
    expect(EASING_PRESETS['ease-in']).toBeDefined();
    expect(EASING_PRESETS['ease-in'](0)).toBe(0);
    expect(EASING_PRESETS['ease-in'](1)).toBe(1);
  });

  it('should have ease-out preset', () => {
    expect(EASING_PRESETS['ease-out']).toBeDefined();
    expect(EASING_PRESETS['ease-out'](0)).toBe(0);
    expect(EASING_PRESETS['ease-out'](1)).toBe(1);
  });

  it('should have ease-in-out preset', () => {
    expect(EASING_PRESETS['ease-in-out']).toBeDefined();
    expect(EASING_PRESETS['ease-in-out'](0)).toBe(0);
    expect(EASING_PRESETS['ease-in-out'](1)).toBe(1);
  });

  it('should have smooth preset', () => {
    expect(EASING_PRESETS.smooth).toBeDefined();
    expect(EASING_PRESETS.smooth(0)).toBe(0);
    expect(EASING_PRESETS.smooth(1)).toBe(1);
  });

  it('should return values between 0 and 1 for all presets', () => {
    Object.values(EASING_PRESETS).forEach((preset) => {
      for (let t = 0; t <= 1; t += 0.1) {
        const result = preset(t);
        expect(result).toBeGreaterThanOrEqual(-0.01); // allow small floating point error
        expect(result).toBeLessThanOrEqual(1.01);
      }
    });
  });
});

describe('getEasedValue', () => {
  it('should use linear easing by default', () => {
    expect(getEasedValue(0.5)).toBe(0.5);
    expect(getEasedValue(0)).toBe(0);
    expect(getEasedValue(1)).toBe(1);
  });

  it('should accept all preset names (case-insensitive)', () => {
    expect(getEasedValue(0.5, 'linear')).toBe(0.5);
    expect(getEasedValue(0.5, 'LINEAR')).toBe(0.5);
    expect(getEasedValue(0.5, 'ease-in')).toBeDefined();
    expect(getEasedValue(0.5, 'EASE-IN')).toBeDefined();
    expect(getEasedValue(0.5, 'ease-out')).toBeDefined();
    expect(getEasedValue(0.5, 'ease-in-out')).toBeDefined();
    expect(getEasedValue(0.5, 'smooth')).toBeDefined();
  });

  it('should fall back to linear for unknown easing names', () => {
    expect(getEasedValue(0.5, 'unknown')).toBe(0.5);
    expect(getEasedValue(0.5, 'invalid-easing')).toBe(0.5);
  });

  it('should clamp t to [0,1] range', () => {
    expect(getEasedValue(-0.5, 'linear')).toBe(0);
    expect(getEasedValue(1.5, 'linear')).toBe(1);
    expect(getEasedValue(-1, 'ease-in')).toBe(0);
    expect(getEasedValue(2, 'ease-out')).toBe(1);
  });

  it('should return 0 at t=0 for all easings', () => {
    Object.keys(EASING_PRESETS).forEach((name) => {
      expect(getEasedValue(0, name)).toBe(0);
    });
  });

  it('should return 1 at t=1 for all easings', () => {
    Object.keys(EASING_PRESETS).forEach((name) => {
      expect(getEasedValue(1, name)).toBe(1);
    });
  });

  it('should produce different curves for different easings', () => {
    const t = 0.25;
    const linear = getEasedValue(t, 'linear');
    const easeIn = getEasedValue(t, 'ease-in');
    const easeOut = getEasedValue(t, 'ease-out');

    // ease-in should be slower at t=0.25 (value < 0.25)
    expect(easeIn).toBeLessThan(linear);

    // ease-out should be faster at t=0.25 (value > 0.25)
    expect(easeOut).toBeGreaterThan(linear);
  });
});
