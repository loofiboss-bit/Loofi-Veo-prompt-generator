
import { PromptGenerationParams } from '../types';
import { appUIStrings, parameterValues, seriesInstructions, soraPromptTemplate } from '../translations';

export class PromptBuilder {
  private params: PromptGenerationParams;
  private readonly labels: any;
  private readonly langValues: any;
  private readonly isSoraMode: boolean;
  private readonly language: 'en' | 'sv' | 'es' | 'fr' | 'de';

  constructor(params: PromptGenerationParams) {
    // Create a shallow copy to avoid mutating the original object
    this.params = { ...params };
    this.language = this.params.language;
    this.isSoraMode = this.params.targetModel === 'sora';
    this.labels = (appUIStrings[this.language] || appUIStrings['en']).fieldLabels;
    this.langValues = parameterValues[this.language];
  }

  /**
   * Orchestrates the construction of the final prompt string.
   */
  public build(): string {
    // Resolve placeholders in free-text fields first
    this.params.idea = this.resolveText(this.params.idea);
    this.params.environment = this.resolveText(this.params.environment);

    // 1. Select and prepare the base template
    let template = this.getBaseTemplate();

    if (this.params.generateAsSeries) {
      template = this.injectSeriesInstruction(template);
    }

    // 2. Build the list of structured parameters
    const parameterList = this.buildParameterList();

    // 3. Assemble the core prompt
    let finalPrompt = template
      .replace('"{idea}"', `"${this.params.idea}"`)
      .replace('{parameterList}', parameterList);

    // 4. Append Audio Mix Instructions
    if (this.params.audioMix) {
      finalPrompt += this.buildAudioMixInstruction();
    }

    // 5. Inject Character Cameo Instructions
    finalPrompt = this.injectCameoInstruction(finalPrompt);

    // 6. Inject Spatial Motion Instructions
    finalPrompt = this.injectSpatialMotionInstruction(finalPrompt);

    return finalPrompt;
  }

  /**
   * Resolves placeholders like {{key}} in a string with corresponding values from the state.
   */
  private resolveText(text: string): string {
    if (!text || typeof text !== 'string') {
      return text;
    }

    return text.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const trimmedKey = key.trim() as keyof PromptGenerationParams;
      // Safety check to ensure key exists on params
      if (Object.prototype.hasOwnProperty.call(this.params, trimmedKey)) {
        const value = this.params[trimmedKey];
        if (value !== null && value !== undefined && String(value).trim() !== '') {
          return String(value);
        }
      }
      return match;
    });
  }

  /**
   * Selects the appropriate base template (Veo or Sora).
   */
  private getBaseTemplate(): string {
    // Veo 3 specific base template logic
    if (!this.isSoraMode) {
        return `Create a masterfully crafted, high-fidelity video generation prompt for Google Veo 3 based on the following specifications.
        
**Core Concept:** "{idea}"

**Cinematography & Technical Specifications:**
{parameterList}

**Directorial Vision:**
Synthesize these elements into a cohesive, sensorially rich narrative. Focus on volumetric lighting, realistic texture rendering (e.g. skin pores, fabric weave), and fluid, physically accurate motion. Describe the scene as if writing for a high-budget film production, emphasizing optical realism, depth of field, and atmospheric density. Avoid ambiguity.`;
    }
    return soraPromptTemplate[this.language];
  }

  /**
   * Injects instructions for generating a series into the template.
   */
  private injectSeriesInstruction(template: string): string {
    const seriesInstruction = seriesInstructions[this.language];

    if (this.isSoraMode) {
      // For Sora, simply append to the body
      return `${template}\n\n${seriesInstruction}`;
    } else {
      // For standard template, insert at a specific point for better flow
      return `${template}\n\n${seriesInstruction}`;
    }
  }

  /**
   * Iterates through all labels to build the formatted parameter lines.
   */
  private buildParameterList(): string {
    return Object.keys(this.labels)
      .map(key => this.formatParameterLine(key))
      .filter(Boolean)
      .join('\n');
  }

  /**
   * Formats a single parameter into a prompt string line.
   */
  private formatParameterLine(key: string): string | null {
    // Explicitly skip specific keys handled elsewhere or not needed in the main list
    if (key === 'customArtStyle') return null;

    const value = this.params[key as keyof PromptGenerationParams];
    let stringValue = '';

    if (typeof value === 'boolean') {
      if (key === 'optimizeFor8Seconds' && value) {
        stringValue = this.isSoraMode ? this.langValues.optimization_sora : this.langValues.optimization;
      } else if (key === 'includeOverlayText' && value) {
        stringValue = this.langValues.overlay;
      } else if (key === 'useGoogleSearch' && value) {
        stringValue = 'Yes';
      }
    } else if (typeof value === 'string' && value.trim()) {
      // Filter out default/placeholder values
      if (['Any', 'None', 'Medium', 'Balanced'].includes(value)) {
        stringValue = '';
      } else if (key === 'artStyle' && value === 'Custom') {
        stringValue = this.params.customArtStyle?.trim() || '';
      } else if (key === 'voiceOver' && this.params.voiceStyle === 'None') {
        stringValue = '';
      } else {
        stringValue = value.trim();
      }
    }

    if (!stringValue) return null;

    // Apply specific enhancements based on model choice
    const enhancement = this.isSoraMode 
        ? this.getSoraEnhancement(key, stringValue) 
        : this.getVeoEnhancement(key, stringValue);

    return `- **${this.labels[key]}**: "${stringValue}"${enhancement}`;
  }

  /**
   * Generates specific enhancement text for Veo 3 based on the parameter key and value.
   */
  private getVeoEnhancement(key: string, value: string): string {
      switch (key) {
          case 'artStyle':
              if (value.toLowerCase().includes('cinematic')) {
                  return ' (Target: IMAX digital quality, fine grain 35mm film stock, high dynamic range color grading)';
              } else if (value.toLowerCase().includes('photorealistic')) {
                  return ' (Target: 8k raw photography, ultra-realistic textures, ray-traced reflections, perfect white balance)';
              } else if (value.toLowerCase().includes('anime')) {
                  return ' (Target: High-budget studio production, detailed backgrounds, fluid frame rates, vibrant cell shading)';
              }
              break;
          case 'cameraMovement':
              return ' (Execution: Professional stabilization, cinematic velocity curves, motivated camera movement)';
          case 'lightingStyle':
              return ' (Execution: Volumetric fog effects, subsurface scattering on skin/materials, physically based light falloff)';
          case 'visualEffect':
              if (value !== 'None') {
                  return ' (Execution: Integrated via optical simulation, consistent with scene lighting and depth)';
              }
              break;
          case 'characterClothing':
              return ' (Detail: High-resolution fabric weave, realistic cloth physics reacting to wind/movement, accurate draping)';
          case 'environment':
              return ' (Detail: Richly populated background, atmospheric depth, ambient occlusion, intricate set design)';
      }
      return '';
  }

  /**
   * Generates specific enhancement text for Sora mode based on the parameter key and value.
   */
  private getSoraEnhancement(key: string, value: string): string {
    switch (key) {
      case 'environment':
        return ' (Simulation: Emphasize a complete world state—wind rustling specific leaves, dust motes caught in light beams, background agents with independent agency)';
      case 'characterActions':
        return ' (Simulation: Focus on the weight, momentum, and friction of movement. Micro-expressions should reflect internal thought processes. Interactions must show causality.)';
      case 'artStyle':
        if (value.toLowerCase().includes('photorealistic')) {
          return ' (Simulation: Indistinguishable from reality. Perfect physical lighting simulation, complex material properties including refraction and subsurface scattering.)';
        }
        break;
      case 'cameraMovement':
        if (!['Static shot', 'Any', 'None'].includes(value)) {
          return ' (Simulation: Detail the camera\'s path with cinematic precision. Describe the lens breathing during focus pulls and the mechanical weight of the camera rig.)';
        }
        break;
      case 'weather':
        return ' (Simulation: Describe the physical effect of this weather on every element—hair matted by rain, fabric darkened by moisture, puddles reflecting the scene dynamically.)';
      case 'environmentDynamicEvents':
        return ' (Simulation: Ensure these events follow the laws of physics. Smoke should dissipate realistically; fluids should flow with correct viscosity.)';
    }
    return '';
  }

  /**
   * Builds the Audio Mix instruction string based on volume percentages.
   */
  private buildAudioMixInstruction(): string {
    const { voice, ambient, sfx } = this.params.audioMix;
    const getLevel = (val: number) => {
      if (val < 30) return 'Background';
      if (val > 70) return 'Foreground/Prominent';
      return 'Balanced';
    };

    return `\n\n**Audio Engineering & Soundscape:**\n- **Voice-over:** ${getLevel(voice)} (${voice}%). Style: ${this.params.voiceStyle}.\n- **Ambience:** ${getLevel(ambient)} (${ambient}%). ${this.params.ambientSound} providing the atmospheric bed.\n- **Sound Effects:** ${getLevel(sfx)} (${sfx}%). ${this.params.soundEffectsIntensity} intensity events sync-locked to on-screen actions.`;
  }

  /**
   * Builds and injects the Character Cameo instruction string.
   */
  private injectCameoInstruction(template: string): string {
    if (this.params.targetModel !== 'sora' || !this.params.useImageAsCameo || !this.params.characterCameoTag) {
      return template;
    }

    let instruction = '';
    if (this.params.uploadedImage) {
      instruction = `\n\n**Character Identity Enforcement:** The character referred to as "${this.params.characterCameoTag}" must be rendered with high-fidelity likeness to the person in the provided reference image. Maintain consistent facial features, body structure, and clothing throughout the entire sequence, regardless of camera angle or lighting conditions.`;
    } else {
      instruction = `\n\n**Character Consistency Protocol:** The character referred to as "${this.params.characterCameoTag}" is a designated recurring subject. Maintain absolute consistency in their appearance, proportions, and styling throughout the video, treating the tag as a rigorous reference to a specific identity.`;
    }

    // Try to inject before the final closing statement of the Sora template for better flow
    const injectionPoint = '\n\nThe video should be indistinguishable';
    if (template.includes(injectionPoint)) {
      return template.replace(injectionPoint, `${instruction}${injectionPoint}`);
    } else {
      // Fallback: just append it
      return template + instruction;
    }
  }

  /**
   * Builds and injects the Spatial Director Motion instruction string.
   */
  private injectSpatialMotionInstruction(template: string): string {
    if (!this.params.spatialMotions || Object.keys(this.params.spatialMotions).length === 0) {
        return template;
    }

    const sectorNames: Record<string, string> = {
        '0-0': 'Top-Left Quadrant',
        '0-1': 'Top-Center Region',
        '0-2': 'Top-Right Quadrant',
        '1-0': 'Middle-Left Region',
        '1-1': 'Center Frame',
        '1-2': 'Middle-Right Region',
        '2-0': 'Bottom-Left Quadrant',
        '2-1': 'Bottom-Center Region',
        '2-2': 'Bottom-Right Quadrant'
    };

    let instruction = '\n\n**Spatial Dynamics & Regional Motion Control:**\n';
    instruction += 'Ensure the following specific motions occur strictly within their designated frame sectors:\n';

    Object.entries(this.params.spatialMotions).forEach(([gridId, motion]) => {
        if (motion && motion.trim()) {
            const readableSector = sectorNames[gridId] || gridId;
            instruction += `- **${readableSector}**: ${motion.trim()}\n`;
        }
    });

    return template + instruction;
  }
}

/**
 * Wrapper function to maintain compatibility with existing service calls.
 */
export function buildGeminiPrompt(params: PromptGenerationParams): string {
  return new PromptBuilder(params).build();
}
