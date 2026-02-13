/**
 * Cubic Bezier easing implementation.
 * Calculates the y-value for a given x-value (t) on a cubic bezier curve defined by P0(0,0), P1, P2, P3(1,1).
 */
export function cubicBezier(t: number, p1x: number, p1y: number, p2x: number, p2y: number): number {
  // Coefficients
  const cx = 3 * p1x;
  const bx = 3 * (p2x - p1x) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * p1y;
  const by = 3 * (p2y - p1y) - cy;
  const ay = 1 - cy - by;

  // Bezier value at t
  const sampleCurveX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleCurveY = (t: number) => ((ay * t + by) * t + cy) * t;
  const sampleCurveDerivativeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  // Newton-Raphson to find t for a given x
  const solveCurveX = (x: number, epsilon: number = 1e-6): number => {
    let t0, t1, t2, x2, d2, i;
    // First try a few iterations of Newton's method
    for (t2 = x, i = 0; i < 8; i++) {
      x2 = sampleCurveX(t2) - x;
      if (Math.abs(x2) < epsilon) return t2;
      d2 = sampleCurveDerivativeX(t2);
      if (Math.abs(d2) < 1e-6) break;
      t2 = t2 - x2 / d2;
    }
    // Fallback to binary search
    t0 = 0.0;
    t1 = 1.0;
    t2 = x;
    if (t2 < t0) return t0;
    if (t2 > t1) return t1;
    while (t0 < t1) {
      x2 = sampleCurveX(t2);
      if (Math.abs(x2 - x) < epsilon) return t2;
      if (x > x2) t0 = t2;
      else t1 = t2;
      t2 = (t1 - t0) * 0.5 + t0;
    }
    return t2;
  };

  // Calculate y given x
  return sampleCurveY(solveCurveX(t));
}

export const EASING_PRESETS = {
  linear: (t: number) => t,
  'ease-in': (t: number) => cubicBezier(t, 0.42, 0, 1, 1),
  'ease-out': (t: number) => cubicBezier(t, 0, 0, 0.58, 1),
  'ease-in-out': (t: number) => cubicBezier(t, 0.42, 0, 0.58, 1),
  smooth: (t: number) => cubicBezier(t, 0.42, 0, 0.58, 1),
};

export const getEasedValue = (t: number, easing: string = 'linear'): number => {
  // Standardize key name
  const key = easing.toLowerCase() as keyof typeof EASING_PRESETS;
  const func = EASING_PRESETS[key] || EASING_PRESETS.linear;
  return func(Math.max(0, Math.min(1, t)));
};
