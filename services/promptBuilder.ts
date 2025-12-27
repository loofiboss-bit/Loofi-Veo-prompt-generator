
import { PromptGenerationParams } from '../types';
import { promptTemplates, appUIStrings, parameterValues, seriesInstructions, soraPromptTemplate } from '../translations';

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
        return `Create a high-fidelity, cinematic video with Veo 3 based on:
Idea: "{idea}"
{parameterList}
Ensure consistent lighting, realistic physics, and rich textures.`;
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

    return `- ${this.labels[key]}: "${stringValue}"${enhancement}`;
  }

  /**
   * Generates specific enhancement text for Veo 3 based on the parameter key and value.
   */
  private getVeoEnhancement(key: string, value: string): string {
      switch (key) {
          case 'artStyle':
              if (value.toLowerCase().includes('cinematic') || value.toLowerCase().includes('photorealistic')) {
                  return ' (High fidelity, 4k, HDR, incredibly detailed texture)';
              }
              break;
          case 'cameraMovement':
              return ' (Smooth, stabilized camera motion)';
          case 'lightingStyle':
              return ' (Volumetric lighting, realistic shadow falloff)';
          case 'visualEffect':
              if (value !== 'None') {
                  return ' (Rendered with high optical accuracy)';
              }
              break;
          case 'characterClothing':
              return ' (Detailed fabric textures, cloth physics)';
      }
      return '';
  }

  /**
   * Generates specific enhancement text for Sora mode based on the parameter key and value.
   */
  private getSoraEnhancement(key: string, value: string): string {
    switch (key) {
      case 'environment':
        return ' (Emphasize rich sensory details: sights, sounds, textures, and smells that contribute to the world\'s realism)';
      case 'characterActions':
        return ' (Describe the physical interaction with objects and the subtle emotional nuance of the action as a continuous sequence)';
      case 'artStyle':
        if (value.toLowerCase().includes('photorealistic')) {
          return ' (Strive for extreme photorealism, paying close attention to complex lighting, reflections, shadows, and material textures)';
        }
        break;
      case 'cameraMovement':
        if (!['Static shot', 'Any', 'None'].includes(value)) {
          return ' (Detail the camera\'s path with cinematic precision, as if giving instructions to a professional camera operator for a long take)';
        }
        break;
      case 'weather':
        return ' (Describe the physical effect of this weather on the environment and characters, e.g., hair matted by rain, dust kicked up by wind)';
      case 'characterClothing':
        return ' (Describe the texture and physics of the clothing, how it moves, and how it interacts with the environment and character\'s motion)';
      case 'colorPalette':
        return ' (Describe how these colors are affected by light sources, reflections, and atmospheric conditions to create a photorealistic scene)';
      case 'visualEffect':
        if (value !== 'None') {
          return ' (Describe this effect with a physical basis, e.g., how lens flare is caused by a bright light source just out of frame, or how film grain appears on high-ISO footage)';
        }
        break;
      case 'lensType':
        return ' (Describe the specific optical properties, like the subtle barrel distortion of a wide-angle lens or the background compression of a telephoto lens)';
      case 'lightingStyle':
        return ' (Describe the physical properties of this light: its color temperature, hardness/softness, and how it casts shadows and creates highlights on different materials)';
      case 'environmentDynamicEvents':
        return ' (Describe the physics of these events: how wind affects individual objects, the rate at which steam dissipates, etc.)';
      case 'characterObjectInteraction':
        return ' (Detail the precise physical contact, pressure, and resulting subtle movements of the object and the character\'s hand/fingers)';
      case 'compositionalGuide':
        return ' (Describe how elements in the scene naturally create this composition, e.g., how a road creates a leading line)';
    }
    return '';
  }

  /**
   * Builds the Audio Mix instruction string based on volume percentages.
   */
  private buildAudioMixInstruction(): string {
    const { voice, ambient, sfx } = this.params.audioMix;
    const getLevel = (val: number) => {
      if (val < 30) return 'Subtle/Background';
      if (val > 70) return 'Prominent/Loud';
      return 'Balanced/Moderate';
    };

    return `\n\n**Audio Mix Priority:**\n- Voice-over: ${getLevel(voice)} (${voice}%)\n- Ambient Sound: ${getLevel(ambient)} (${ambient}%)\n- Sound Effects: ${getLevel(sfx)} (${sfx}%)`;
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
      instruction = `\n\n**Character Cameo Instruction:** The character referred to as "${this.params.characterCameoTag}" must be created with the exact likeness of the person in the provided reference image. Maintain their appearance, clothing, and distinguishing features throughout the video.`;
    } else {
      instruction = `\n\n**Character Cameo Instruction:** The character referred to as "${this.params.characterCameoTag}" is a designated cameo character. Maintain a consistent appearance for this character throughout the video, treating the tag as a reference to a specific individual (e.g., a celebrity or a uniquely named character).`;
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
}

/**
 * Wrapper function to maintain compatibility with existing service calls.
 */
export function buildGeminiPrompt(params: PromptGenerationParams): string {
  return new PromptBuilder(params).build();
}
