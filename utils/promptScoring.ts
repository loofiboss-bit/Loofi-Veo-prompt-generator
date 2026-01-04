
import { PromptState } from '../types';

export interface QualityScore {
  score: number;
  tier: 'Basic' | 'Enhanced' | 'Cinematic' | 'Masterpiece';
  color: 'red' | 'yellow' | 'green' | 'cyan';
  suggestions: string[];
  metCriteria: string[];
}

export const calculatePromptQuality = (state: PromptState): QualityScore => {
  let score = 0;
  const suggestions: string[] = [];
  const metCriteria: string[] = [];

  // 1. Core Content (Max 30)
  if (state.idea && state.idea.length > 10) {
    score += 15;
    if (state.idea.length > 50) {
      score += 15;
      metCriteria.push("Rich Core Concept");
    } else {
      suggestions.push("Expand your core idea for more detail");
      metCriteria.push("Basic Concept");
    }
  } else {
    suggestions.push("Add a core idea");
  }

  // 2. Visual Style (Max 20)
  if (state.artStyle && state.artStyle !== 'Cinematic') { // 'Cinematic' is default/generic often
    score += 10;
    metCriteria.push("Specific Art Style");
  }
  if (state.visualEffect && state.visualEffect !== 'None') {
    score += 5;
    metCriteria.push("Visual Effects");
  }
  if (state.colorPalette && state.colorPalette !== 'Vibrant and saturated') {
    score += 5;
    metCriteria.push("Color Palette");
  }
  if (score < 10) suggestions.push("Define a specific visual style or effect");

  // 3. Cinematic Properties (Max 20)
  let cameraScore = 0;
  if (state.cameraMovement && state.cameraMovement !== 'Static shot') cameraScore += 5;
  if (state.cameraDistance && state.cameraDistance !== 'Medium shot') cameraScore += 5;
  if (state.lensType && state.lensType !== 'Standard prime lens') cameraScore += 5;
  if (state.compositionalGuide && state.compositionalGuide !== 'Any') cameraScore += 5;
  
  score += cameraScore;
  if (cameraScore > 0) metCriteria.push("Camera Direction");
  else suggestions.push("Add camera movement or lens details");

  // 4. Environment & Lighting (Max 20)
  let envScore = 0;
  if (state.environment && state.environment.length > 5) envScore += 5;
  if (state.timeOfDay && state.timeOfDay !== 'Any') envScore += 5;
  if (state.weather && state.weather !== 'Any') envScore += 5;
  if (state.lightingStyle && state.lightingStyle !== 'Any') envScore += 5;

  score += envScore;
  if (envScore > 0) metCriteria.push("Environment & Lighting");
  else suggestions.push("Specify time of day, weather, or lighting");

  // 5. Advanced / Character (Max 10)
  if (state.characterActions && state.characterActions.length > 5) {
    score += 5;
    metCriteria.push("Character Action");
  }
  if (state.negativePrompt && state.negativePrompt.length > 3) {
    score += 5;
    metCriteria.push("Negative Constraint");
  }

  // Determine Tier
  let tier: QualityScore['tier'] = 'Basic';
  let color: QualityScore['color'] = 'red';

  if (score >= 90) {
    tier = 'Masterpiece';
    color = 'cyan';
  } else if (score >= 70) {
    tier = 'Cinematic';
    color = 'green';
  } else if (score >= 40) {
    tier = 'Enhanced';
    color = 'yellow';
  }

  return { score: Math.min(score, 100), tier, color, suggestions, metCriteria };
};
