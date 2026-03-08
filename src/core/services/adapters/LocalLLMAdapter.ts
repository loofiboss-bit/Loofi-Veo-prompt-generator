import { VideoModelAdapter } from './VideoModelAdapter';
import { PromptState } from '@core/types';
import { interpolateVariables } from '../promptBuilder';

/**
 * Adapter for local LLM inference (Ollama / Llama.cpp compatible).
 * Implements the same VideoModelAdapter interface as VeoAdapter/SoraAdapter
 * so it can be used as a drop-in replacement for prompt building.
 *
 * The buildPrompt method constructs a structured prompt optimized for
 * local models — it uses a system-instruction style format that works
 * well with instruction-tuned models like Llama 3, Mistral, etc.
 *
 * NOTE: This adapter handles prompt *formatting* only. For actual LLM
 * communication (health checks, generation), use ollamaProvider.ts.
 */
export class LocalLLMAdapter implements VideoModelAdapter {
  validateConstraints(state: PromptState): string[] {
    const warnings: string[] = [];

    if (!state.idea?.trim()) {
      warnings.push(
        'Local models work best with a detailed core idea. Consider adding more description.',
      );
    }

    if (state.useGoogleSearch) {
      warnings.push('Google Search grounding is not available in Local Privacy Mode.');
    }

    if (state.thinkingMode) {
      warnings.push(
        'Thinking mode is a cloud API feature. Local models will use standard generation.',
      );
    }

    return warnings;
  }

  getEnhancements(key: keyof PromptState, value: string): string {
    if (!value) return '';

    switch (key) {
      case 'artStyle':
        if (value.toLowerCase().includes('cinematic')) {
          return ' — cinematic film quality, professional color grading, high dynamic range';
        }
        if (value.toLowerCase().includes('photorealistic')) {
          return ' — ultra-realistic textures, ray-traced lighting, 8K detail';
        }
        if (value.toLowerCase().includes('anime')) {
          return ' — anime studio production quality, vibrant colors, fluid motion';
        }
        break;
      case 'cameraMovement':
        return ' — professional stabilized movement';
      case 'lightingStyle':
        return ' — volumetric lighting with natural falloff';
    }
    return '';
  }

  buildPrompt(state: PromptState, variables: Record<string, string>): string {
    const iState = { ...state };
    iState.idea = interpolateVariables(state.idea, variables);
    iState.environment = interpolateVariables(state.environment, variables);
    iState.characterActions = interpolateVariables(state.characterActions, variables);
    iState.characterVisualDNA = interpolateVariables(state.characterVisualDNA, variables);

    const sections: string[] = [];

    // System-style instruction header for local models
    sections.push(
      '[INSTRUCTION] Generate a detailed video generation prompt based on the following parameters. Output only the final prompt text, no explanations.',
    );

    // Core idea
    let core = iState.idea.trim();
    if (!core) core = 'A cinematic scene.';
    if (!/[.!?]$/.test(core)) core += '.';
    sections.push(`[SCENE] ${core}`);

    // Character
    if (iState.characterVisualDNA?.trim()) {
      sections.push(`[CHARACTER] ${iState.characterVisualDNA}`);
    } else if (iState.characterArchetype !== 'Any' || iState.characterGender !== 'Any') {
      const charParts: string[] = [];
      if (iState.characterArchetype !== 'Any') charParts.push(iState.characterArchetype);
      if (iState.characterGender !== 'Any') charParts.push(iState.characterGender);
      if (iState.characterAge !== 'Any') charParts.push(iState.characterAge);
      if (iState.characterClothing !== 'Any') {
        let clothing = iState.characterClothing;
        if (iState.characterSpecificClothing) clothing += ` (${iState.characterSpecificClothing})`;
        charParts.push(clothing);
      }
      if (charParts.length > 0) sections.push(`[CHARACTER] ${charParts.join(', ')}`);
    }

    if (iState.characterActions) {
      sections.push(`[ACTION] ${iState.characterActions}`);
    }

    // Visual style
    if (iState.artStyle) {
      const style = iState.artStyle === 'Custom' ? iState.customArtStyle : iState.artStyle;
      const enhancement = this.getEnhancements(
        'artStyle',
        iState.artStyle === 'Custom' ? iState.customArtStyle : iState.artStyle,
      );
      sections.push(`[STYLE] ${style}${enhancement}`);
    }

    // Environment
    if (iState.environment) {
      sections.push(`[ENVIRONMENT] ${iState.environment}`);
    }

    // Lighting & atmosphere
    const lighting: string[] = [];
    if (iState.timeOfDay && iState.timeOfDay !== 'Any') lighting.push(iState.timeOfDay);
    if (iState.weather && iState.weather !== 'Any') lighting.push(iState.weather);
    if (iState.lightingStyle && iState.lightingStyle !== 'Any') {
      lighting.push(
        iState.lightingStyle + this.getEnhancements('lightingStyle', iState.lightingStyle),
      );
    }
    if (lighting.length > 0) {
      sections.push(`[LIGHTING] ${lighting.join(', ')}`);
    }

    // Camera
    const camera: string[] = [];
    if (iState.cameraMovement) {
      camera.push(
        iState.cameraMovement + this.getEnhancements('cameraMovement', iState.cameraMovement),
      );
    }
    if (iState.cameraDistance) camera.push(iState.cameraDistance);
    if (iState.lensType) camera.push(iState.lensType);
    if (iState.compositionalGuide && iState.compositionalGuide !== 'Any') {
      camera.push(`Composition: ${iState.compositionalGuide}`);
    }
    if (camera.length > 0) {
      sections.push(`[CAMERA] ${camera.join(', ')}`);
    }

    // Technical specs
    const specs: string[] = [];
    if (iState.resolution) specs.push(`Resolution: ${iState.resolution}`);
    if (iState.aspectRatio) specs.push(`Aspect Ratio: ${iState.aspectRatio}`);
    if (iState.visualEffect && iState.visualEffect !== 'None') {
      specs.push(`Effect: ${iState.visualEffect}`);
    }
    if (specs.length > 0) {
      sections.push(`[SPECS] ${specs.join(', ')}`);
    }

    // Global style enforcement
    if (iState.globalStyle?.isLocked && iState.globalStyle.description) {
      sections.push(
        `[GLOBAL STYLE LOCK] Maintain strict visual consistency: ${iState.globalStyle.description} (Strength: ${iState.globalStyle.strength}%)`,
      );
    }

    // Negative prompt
    const negatives: string[] = [];
    if (iState.negativePrompt) negatives.push(iState.negativePrompt);
    if (iState.characterNegativePrompt) negatives.push(iState.characterNegativePrompt);
    if (iState.globalStyle?.isLocked && iState.globalStyle.description) {
      negatives.push('style inconsistency, deviation from project look');
    }
    if (negatives.length > 0) {
      sections.push(`[EXCLUDE] ${negatives.join(', ')}`);
    }

    // Spatial motions
    if (iState.spatialMotions && Object.keys(iState.spatialMotions).length > 0) {
      const spatialDirectives = Object.entries(iState.spatialMotions)
        .map(([grid, motion]) => `Grid ${grid}: ${motion}`)
        .join('; ');
      sections.push(`[SPATIAL] ${spatialDirectives}`);
    }

    return sections.join('\n\n');
  }
}
