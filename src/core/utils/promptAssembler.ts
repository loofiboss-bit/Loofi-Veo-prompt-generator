import type { PromptState } from '@core/types';

/**
 * Assembles a best-effort prompt preview string from the current PromptState.
 * Pure function — no AI calls, no side effects.
 * Returns empty string when idea is blank.
 */
export function assemblePromptPreview(state: PromptState): string {
  if (!state.idea?.trim()) return '';

  const parts: string[] = [state.idea.trim()];

  if (state.artStyle) parts.push(`Art style: ${state.artStyle}`);
  else if (state.customArtStyle) parts.push(`Art style: ${state.customArtStyle}`);

  if (state.lightingStyle) parts.push(`Lighting: ${state.lightingStyle}`);
  if (state.colorPalette) parts.push(`Color palette: ${state.colorPalette}`);
  if (state.cameraMovement) parts.push(`Camera: ${state.cameraMovement}`);
  if (state.cameraDistance) parts.push(`Shot: ${state.cameraDistance}`);
  if (state.lensType) parts.push(`Lens: ${state.lensType}`);

  if (state.timeOfDay) parts.push(`Time of day: ${state.timeOfDay}`);
  if (state.weather) parts.push(`Weather: ${state.weather}`);
  if (state.environment) parts.push(`Environment: ${state.environment}`);

  if (state.characterArchetype) parts.push(`Character: ${state.characterArchetype}`);
  else if (state.characterGender || state.characterAge) {
    const charParts = [state.characterAge, state.characterGender].filter(Boolean);
    if (charParts.length) parts.push(`Character: ${charParts.join(' ')}`);
  }

  if (state.ambientSound) parts.push(`Ambient: ${state.ambientSound}`);
  if (state.aspectRatio) parts.push(`Aspect ratio: ${state.aspectRatio}`);
  if (state.motionIntensity) parts.push(`Motion: ${state.motionIntensity}`);

  return parts.join('. ');
}
