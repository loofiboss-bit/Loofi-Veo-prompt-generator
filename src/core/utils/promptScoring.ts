import { PromptState } from '@core/types';

export interface QualityScore {
  score: number;
  tier: 'Basic' | 'Enhanced' | 'Cinematic' | 'Masterpiece';
  color: 'red' | 'yellow' | 'green' | 'cyan';
  suggestions: string[];
  metCriteria: string[];
  /** Per-dimension breakdown for diagnostics (v1.8.0) */
  breakdown: QualityDimension[];
}

export interface QualityDimension {
  name: string;
  score: number;
  maxScore: number;
  criteria: string[];
  suggestions: string[];
}

interface SectionScoreResult {
  dimension: QualityDimension;
  metCriteria: string[];
}

// Reusable worker instance for prompt analysis offloading
let promptWorker: Worker | null = null;
let workerIdCounter = 0;

function getPromptWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null;
  try {
    if (!promptWorker) {
      promptWorker = new Worker(
        new URL('../../infrastructure/workers/promptAnalysis.worker.ts', import.meta.url),
        { type: 'module' },
      );
    }
    return promptWorker;
  } catch {
    return null;
  }
}

/**
 * Async wrapper that delegates prompt quality scoring to a Web Worker.
 * Falls back to synchronous scoring if workers are unavailable.
 */
export const calculatePromptQualityAsync = (
  state: PromptState,
  timeoutMs = 5000,
): Promise<QualityScore> => {
  const worker = getPromptWorker();

  if (!worker) {
    return Promise.resolve(calculatePromptQuality(state));
  }

  return new Promise<QualityScore>((resolve) => {
    const id = ++workerIdCounter;
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(calculatePromptQuality(state));
      }
    }, timeoutMs);

    const handler = (e: MessageEvent) => {
      if (settled) return;
      const { type, payload } = e.data;

      if (type === 'PROMPT_SCORE_RESULT' || type === 'ERROR') {
        settled = true;
        clearTimeout(timer);
        worker.removeEventListener('message', handler);

        if (type === 'PROMPT_SCORE_RESULT') {
          resolve(payload as QualityScore);
        } else {
          resolve(calculatePromptQuality(state));
        }
      }
    };

    worker.addEventListener('message', handler);
    worker.postMessage({ type: 'SCORE_PROMPT', payload: state, id });
  });
};

/**
 * Terminate the prompt analysis worker (for cleanup in tests or shutdown).
 */
export const terminatePromptWorker = (): void => {
  if (promptWorker) {
    promptWorker.terminate();
    promptWorker = null;
  }
};

// ─── Section Scoring Helpers ─────────────────────────────────────────────

function scoreCoreContent(state: PromptState): SectionScoreResult {
  const metCriteria: string[] = [];
  const coreDim: QualityDimension = {
    name: 'Core Content',
    score: 0,
    maxScore: 30,
    criteria: [],
    suggestions: [],
  };

  if (state.idea && state.idea.length > 10) {
    coreDim.score += 15;
    if (state.idea.length > 50) {
      coreDim.score += 10;
      coreDim.criteria.push('Rich Core Concept');
      metCriteria.push('Rich Core Concept');
    } else {
      coreDim.suggestions.push('Expand your core idea for more detail');
      coreDim.criteria.push('Basic Concept');
      metCriteria.push('Basic Concept');
    }
    // Bonus for descriptive language (v1.8.0)
    if (state.idea.length > 100) {
      coreDim.score += 5;
      coreDim.criteria.push('Detailed Vision');
      metCriteria.push('Detailed Vision');
    }
  } else {
    coreDim.suggestions.push('Add a core idea');
  }

  return { dimension: coreDim, metCriteria };
}

function scoreVisualStyle(state: PromptState): SectionScoreResult {
  const metCriteria: string[] = [];
  const visualDim: QualityDimension = {
    name: 'Visual Style',
    score: 0,
    maxScore: 20,
    criteria: [],
    suggestions: [],
  };

  if (state.artStyle && state.artStyle !== 'Cinematic') {
    visualDim.score += 8;
    visualDim.criteria.push('Specific Art Style');
    metCriteria.push('Specific Art Style');
  }
  if (state.visualEffect && state.visualEffect !== 'None') {
    visualDim.score += 4;
    visualDim.criteria.push('Visual Effects');
    metCriteria.push('Visual Effects');
  }
  if (state.colorPalette && state.colorPalette !== 'Vibrant and saturated') {
    visualDim.score += 4;
    visualDim.criteria.push('Color Palette');
    metCriteria.push('Color Palette');
  }
  // v1.8.0: Custom art style bonus
  if (state.customArtStyle && state.customArtStyle.trim().length > 5) {
    visualDim.score += 4;
    visualDim.criteria.push('Custom Art Style');
    metCriteria.push('Custom Art Style');
  }
  if (visualDim.score === 0) {
    visualDim.suggestions.push('Define a specific visual style or effect');
  }

  return { dimension: visualDim, metCriteria };
}

function scoreCinematicProperties(state: PromptState): SectionScoreResult {
  const metCriteria: string[] = [];
  const cameraDim: QualityDimension = {
    name: 'Cinematic Properties',
    score: 0,
    maxScore: 20,
    criteria: [],
    suggestions: [],
  };

  if (state.cameraMovement && state.cameraMovement !== 'Static shot') {
    cameraDim.score += 5;
    cameraDim.criteria.push('Camera Movement');
  }
  if (state.cameraDistance && state.cameraDistance !== 'Medium shot') {
    cameraDim.score += 5;
    cameraDim.criteria.push('Camera Distance');
  }
  if (state.lensType && state.lensType !== 'Standard prime lens') {
    cameraDim.score += 5;
    cameraDim.criteria.push('Lens Type');
  }
  if (state.compositionalGuide && state.compositionalGuide !== 'Any') {
    cameraDim.score += 5;
    cameraDim.criteria.push('Composition Guide');
  }
  if (cameraDim.score > 0) {
    metCriteria.push('Camera Direction');
  } else {
    cameraDim.suggestions.push('Add camera movement or lens details');
  }

  return { dimension: cameraDim, metCriteria };
}

function scoreEnvironmentAndLighting(state: PromptState): SectionScoreResult {
  const metCriteria: string[] = [];
  const envDim: QualityDimension = {
    name: 'Environment & Lighting',
    score: 0,
    maxScore: 20,
    criteria: [],
    suggestions: [],
  };

  if (state.environment && state.environment.length > 5) {
    envDim.score += 5;
    envDim.criteria.push('Environment');
  }
  if (state.timeOfDay && state.timeOfDay !== 'Any') {
    envDim.score += 4;
    envDim.criteria.push('Time of Day');
  }
  if (state.weather && state.weather !== 'Any') {
    envDim.score += 4;
    envDim.criteria.push('Weather');
  }
  if (state.lightingStyle && state.lightingStyle !== 'Any') {
    envDim.score += 4;
    envDim.criteria.push('Lighting Style');
  }
  // v1.8.0: Sensory detail bonus
  if (state.environmentSensoryDetails && state.environmentSensoryDetails.trim().length > 5) {
    envDim.score += 3;
    envDim.criteria.push('Sensory Details');
    metCriteria.push('Sensory Details');
  }
  if (envDim.score > 0) {
    metCriteria.push('Environment & Lighting');
  } else {
    envDim.suggestions.push('Specify time of day, weather, or lighting');
  }

  return { dimension: envDim, metCriteria };
}

function scoreCharacterAndConstraints(state: PromptState): SectionScoreResult {
  const metCriteria: string[] = [];
  const charDim: QualityDimension = {
    name: 'Character & Constraints',
    score: 0,
    maxScore: 15,
    criteria: [],
    suggestions: [],
  };

  if (state.characterActions && state.characterActions.length > 5) {
    charDim.score += 4;
    charDim.criteria.push('Character Action');
    metCriteria.push('Character Action');
  }
  if (state.negativePrompt && state.negativePrompt.length > 3) {
    charDim.score += 3;
    charDim.criteria.push('Negative Constraint');
    metCriteria.push('Negative Constraint');
  }
  // v1.8.0: Character nuance bonus
  if (state.characterNuances && state.characterNuances.trim().length > 5) {
    charDim.score += 3;
    charDim.criteria.push('Character Nuances');
    metCriteria.push('Character Nuances');
  }
  // v1.8.0: Visual DNA bonus
  if (state.characterVisualDNA && state.characterVisualDNA.trim().length > 5) {
    charDim.score += 3;
    charDim.criteria.push('Visual DNA Lock');
    metCriteria.push('Visual DNA Lock');
  }
  // v1.8.0: Audio/mood bonus
  if (state.voiceOver && state.voiceOver.trim().length > 3) {
    charDim.score += 2;
    charDim.criteria.push('Voice Direction');
    metCriteria.push('Voice Direction');
  }
  if (charDim.score === 0) {
    charDim.suggestions.push('Add character actions or negative constraints');
  }

  return { dimension: charDim, metCriteria };
}

function determineTierAndColor(normalizedScore: number): {
  tier: QualityScore['tier'];
  color: QualityScore['color'];
} {
  if (normalizedScore >= 90) {
    return { tier: 'Masterpiece', color: 'cyan' };
  }
  if (normalizedScore >= 70) {
    return { tier: 'Cinematic', color: 'green' };
  }
  if (normalizedScore >= 40) {
    return { tier: 'Enhanced', color: 'yellow' };
  }
  return { tier: 'Basic', color: 'red' };
}

export const calculatePromptQuality = (state: PromptState): QualityScore => {
  const sections = [
    scoreCoreContent(state),
    scoreVisualStyle(state),
    scoreCinematicProperties(state),
    scoreEnvironmentAndLighting(state),
    scoreCharacterAndConstraints(state),
  ];

  let rawScore = 0;
  const suggestions: string[] = [];
  const metCriteria: string[] = [];
  const breakdown: QualityDimension[] = [];

  for (const { dimension, metCriteria: sectionMetCriteria } of sections) {
    rawScore += dimension.score;
    suggestions.push(...dimension.suggestions);
    metCriteria.push(...sectionMetCriteria);
    breakdown.push(dimension);
  }

  // Determine Tier (adjusted thresholds for expanded max of 105)
  const normalizedScore = Math.min(Math.round((rawScore / 105) * 100), 100);
  const { tier, color } = determineTierAndColor(normalizedScore);

  return { score: normalizedScore, tier, color, suggestions, metCriteria, breakdown };
};
