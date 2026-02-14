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

export const calculatePromptQuality = (state: PromptState): QualityScore => {
  let score = 0;
  const suggestions: string[] = [];
  const metCriteria: string[] = [];
  const breakdown: QualityDimension[] = [];

  // 1. Core Content (Max 30)
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
      suggestions.push('Expand your core idea for more detail');
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
    suggestions.push('Add a core idea');
  }
  score += coreDim.score;
  breakdown.push(coreDim);

  // 2. Visual Style (Max 20)
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
    suggestions.push('Define a specific visual style or effect');
  }
  score += visualDim.score;
  breakdown.push(visualDim);

  // 3. Cinematic Properties (Max 20)
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
  if (cameraDim.score > 0) metCriteria.push('Camera Direction');
  else {
    cameraDim.suggestions.push('Add camera movement or lens details');
    suggestions.push('Add camera movement or lens details');
  }
  score += cameraDim.score;
  breakdown.push(cameraDim);

  // 4. Environment & Lighting (Max 20)
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
  if (envDim.score > 0) metCriteria.push('Environment & Lighting');
  else {
    envDim.suggestions.push('Specify time of day, weather, or lighting');
    suggestions.push('Specify time of day, weather, or lighting');
  }
  score += envDim.score;
  breakdown.push(envDim);

  // 5. Character & Constraints (Max 15)
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
    suggestions.push('Add character actions or negative constraints');
  }
  score += charDim.score;
  breakdown.push(charDim);

  // Determine Tier (adjusted thresholds for expanded max of 105)
  const normalizedScore = Math.min(Math.round((score / 105) * 100), 100);

  let tier: QualityScore['tier'] = 'Basic';
  let color: QualityScore['color'] = 'red';

  if (normalizedScore >= 90) {
    tier = 'Masterpiece';
    color = 'cyan';
  } else if (normalizedScore >= 70) {
    tier = 'Cinematic';
    color = 'green';
  } else if (normalizedScore >= 40) {
    tier = 'Enhanced';
    color = 'yellow';
  }

  return { score: normalizedScore, tier, color, suggestions, metCriteria, breakdown };
};
