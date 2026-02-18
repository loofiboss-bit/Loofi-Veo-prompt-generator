/**
 * Optimization Rules — v2.7.0
 * Constants, keywords, and heuristic rules for AI-driven prompt optimization.
 */

export const SUGGESTION_CATEGORIES = [
  'style',
  'camera',
  'lighting',
  'specificity',
  'syntax',
] as const;

export const CATEGORY_COLORS: Record<string, string> = {
  style: '#9C27B0', // purple
  camera: '#2196F3', // blue
  lighting: '#FFC107', // yellow
  specificity: '#4CAF50', // green
  syntax: '#F44336', // red
};

export const STYLE_KEYWORDS = [
  'cinematic',
  'photorealistic',
  'anime',
  'watercolor',
  'oil painting',
  'noir',
  'vintage',
  'futuristic',
  'minimalist',
  'surreal',
  'documentary',
  'experimental',
  'gothic',
  'pastel',
  'neon',
  'retro',
  'cyberpunk',
  'steampunk',
  'impressionist',
  'abstract',
  'bollywood',
  'wuxia',
  'film grain',
  'high contrast',
  'soft focus',
  'matte',
  'glossy',
  'dreamy',
  'gritty',
  'ethereal',
  'dramatic',
  'whimsical',
  'moody',
  'vibrant',
  'muted',
  'sepia',
  'monochrome',
  'saturated',
  'desaturated',
  'hdr',
  'lo-fi',
  'vaporwave',
  'art deco',
  'baroque',
  'pop art',
  'comic book',
  'cel-shaded',
  'stop motion',
  'claymation',
  'pixel art',
] as const;

export const CAMERA_KEYWORDS = [
  'pan left',
  'pan right',
  'tilt up',
  'tilt down',
  'dolly in',
  'dolly out',
  'zoom in',
  'zoom out',
  'tracking shot',
  'crane shot',
  'aerial shot',
  'dutch angle',
  'close-up',
  'extreme close-up',
  'wide shot',
  'medium shot',
  'over the shoulder',
  'point of view',
  'handheld',
  'steadicam',
  'slow motion',
  'time lapse',
  'long take',
  'rack focus',
  'pull focus',
  'orbit',
  'push in',
  'pull back',
  'whip pan',
  'static',
] as const;

export const LIGHTING_KEYWORDS = [
  'golden hour',
  'blue hour',
  'natural light',
  'studio lighting',
  'rim light',
  'backlight',
  'key light',
  'fill light',
  'ambient light',
  'dramatic lighting',
  'soft lighting',
  'hard lighting',
  'volumetric light',
  'neon lighting',
  'candlelight',
  'moonlight',
  'overcast',
  'silhouette',
  'chiaroscuro',
  'high key',
  'low key',
] as const;

export const MIN_PROMPT_LENGTH = 50;
export const OPTIMAL_PROMPT_LENGTH_MIN = 150;
export const OPTIMAL_PROMPT_LENGTH_MAX = 500;

export const QUALITY_WEIGHTS: Record<string, number> = {
  specificity: 0.25,
  style: 0.2,
  camera: 0.2,
  lighting: 0.15,
  length: 0.1,
  syntax: 0.1,
};

export const SUGGESTION_CONFIDENCE_THRESHOLD = 0.3;
export const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
export const CACHE_MAX_ENTRIES = 50;
export const DEBOUNCE_MS = 500;
export const DEBOUNCE_MAX_MS = 2000;
