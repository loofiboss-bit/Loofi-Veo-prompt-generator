import { ColorGradeParams } from '@core/types';

interface ImageStats {
  lumaMean: number;
  lumaStdDev: number;
  rMean: number;
  gMean: number;
  bMean: number;
}

const getStats = (data: Uint8ClampedArray): ImageStats => {
  let rSum = 0,
    gSum = 0,
    bSum = 0,
    lumaSum = 0;
  const pixelCount = data.length / 4;

  // 1st Pass: Means
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Rec. 709 luminance
    const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    rSum += r;
    gSum += g;
    bSum += b;
    lumaSum += y;
  }

  const rMean = rSum / pixelCount;
  const gMean = gSum / pixelCount;
  const bMean = bSum / pixelCount;
  const lumaMean = lumaSum / pixelCount;

  // 2nd Pass: StdDev (Contrast proxy)
  let lumaVarianceSum = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    lumaVarianceSum += Math.pow(y - lumaMean, 2);
  }

  const lumaStdDev = Math.sqrt(lumaVarianceSum / pixelCount);

  return { lumaMean, lumaStdDev, rMean, gMean, bMean };
};

/**
 * Calculates CSS filter values to match the 'look' of the reference image on the target.
 * Returns values compatible with standard CSS filter functions (multipliers).
 *
 * @param ref Reference image data (the look we want)
 * @param target Target image data (the clip we are grading)
 */
export const calculateColorMatch = (ref: ImageData, target: ImageData): ColorGradeParams => {
  const refStats = getStats(ref.data);
  const targetStats = getStats(target.data);

  // 1. Brightness
  // Simple ratio of means. Avoid div by zero.
  const brightness = targetStats.lumaMean > 5 ? refStats.lumaMean / targetStats.lumaMean : 1.0;

  // 2. Contrast
  // Ratio of standard deviations.
  const contrast = targetStats.lumaStdDev > 5 ? refStats.lumaStdDev / targetStats.lumaStdDev : 1.0;

  // 3. Saturation (Approximate)
  // We didn't calc saturation stats explicitly, can skip or assume 1.0.
  // Usually standardizing contrast/brightness handles perception well enough for "good enough".
  const saturation = 1.0;

  // 4. Color Temperature (Sepia/Hue shift)
  // Calculate "Warmth" as (R - B).
  const refWarmth = refStats.rMean - refStats.bMean;
  const targetWarmth = targetStats.rMean - targetStats.bMean;
  const warmthDelta = refWarmth - targetWarmth; // Positive = Ref is warmer

  // If Ref is warmer, add Sepia.
  // Sepia(1) adds yellow/brown.
  // Scale: Max possible delta is approx 255.
  // Let's normalize. 255 delta -> 1.0 sepia (extreme).
  // Usually delta is smaller.

  let sepia = 0;
  let hueRotate = 0;

  if (warmthDelta > 0) {
    // Need to warm up
    sepia = Math.min(1.0, warmthDelta / 100);
  } else {
    // Need to cool down (CSS filters are bad at this without SVG filters)
    // Hue rotate can shift yellows to greens/cyans, but it's messy.
    // We'll leave sepia at 0 and maybe slightly shift hue if drastic.
    // For simple CSS implementation, we might just ignore cooling or do minimal hue shift.
    // Let's try to map Blue/Red balance to Hue.
    // A simple hue rotation of -10 to +10 degrees can correct tint.

    // Very basic tint correction
    // If Green mean differs significantly?
    // Let's stick to Sepia for warmth for now as requested by "Simple".
    sepia = 0;
  }

  // Clamp values to sane CSS limits
  const safeBrightness = Math.max(0.5, Math.min(2.0, brightness));
  const safeContrast = Math.max(0.5, Math.min(2.0, contrast));

  return {
    brightness: parseFloat(safeBrightness.toFixed(2)),
    contrast: parseFloat(safeContrast.toFixed(2)),
    saturation: parseFloat(saturation.toFixed(2)),
    sepia: parseFloat(sepia.toFixed(2)),
    hueRotate: Math.round(hueRotate),
  };
};
