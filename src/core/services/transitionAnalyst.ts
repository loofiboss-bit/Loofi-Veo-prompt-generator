import { TransitionType } from '@core/types';

interface ImageStats {
  r: number;
  g: number;
  b: number;
  luma: number;
}

export interface TransitionRecommendation {
  type: TransitionType['type'];
  reason: string;
  confidence: number; // 0 to 1
  scores: {
    colorDiff: number; // %
    lumaDiff: number; // %
  };
}

/**
 * Calculates average RGB and Luma for an image buffer.
 */
const getFrameStats = (data: Uint8ClampedArray): ImageStats => {
  let r = 0,
    g = 0,
    b = 0,
    luma = 0;
  const pixelCount = data.length / 4;

  for (let i = 0; i < data.length; i += 4) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    // Rec. 709 luminance
    luma += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
  }

  return {
    r: r / pixelCount,
    g: g / pixelCount,
    b: b / pixelCount,
    luma: luma / pixelCount,
  };
};

/**
 * Calculates Euclidean distance between colors in RGB space.
 */
const calculateColorDistance = (s1: ImageStats, s2: ImageStats): number => {
  return Math.sqrt(Math.pow(s1.r - s2.r, 2) + Math.pow(s1.g - s2.g, 2) + Math.pow(s1.b - s2.b, 2));
};

export const analyzeCut = (
  outgoingFrame: ImageData,
  incomingFrame: ImageData,
): TransitionRecommendation => {
  const s1 = getFrameStats(outgoingFrame.data);
  const s2 = getFrameStats(incomingFrame.data);

  // Max possible distance in 8-bit RGB is sqrt(255^2 * 3) ~= 441.67
  const colorDist = calculateColorDistance(s1, s2);
  const colorDiffPercent = (colorDist / 441.67) * 100;

  // Luma diff (0-255)
  const lumaDiff = Math.abs(s1.luma - s2.luma);
  const lumaDiffPercent = (lumaDiff / 255) * 100;

  // --- Decision Logic ---

  // Case 1: Continuity Cut (Very similar visuals)
  if (colorDiffPercent < 15) {
    return {
      type: 'cut',
      reason: 'Visuals match closely. A hard cut maintains continuity best.',
      confidence: 0.9,
      scores: { colorDiff: colorDiffPercent, lumaDiff: lumaDiffPercent },
    };
  }

  // Case 2: Flash Cut (Massive brightness difference, e.g. dark room to explosion)
  if (lumaDiffPercent > 45) {
    const type = s2.luma > s1.luma ? 'fade_black' : 'dissolve'; // Or specific Dip to White if supported
    return {
      type: 'fade_black',
      reason: 'High contrast shift. A dip to black eases the eye adaptation.',
      confidence: 0.85,
      scores: { colorDiff: colorDiffPercent, lumaDiff: lumaDiffPercent },
    };
  }

  // Case 3: Scene Change (Different colors, moderate brightness)
  // Cross Dissolve implies passage of time or change of location
  return {
    type: 'dissolve',
    reason: 'Significant visual change. A dissolve softens the scene transition.',
    confidence: 0.75,
    scores: { colorDiff: colorDiffPercent, lumaDiff: lumaDiffPercent },
  };
};
