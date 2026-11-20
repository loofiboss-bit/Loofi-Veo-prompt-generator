import type { CreativeSuggestion } from '@core/types/videoIteration';
import {
  i18n,
  loadLanguageBundle,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from '@core/config/i18n';
import { cleanJson, getAiClientAsync, getPromptModel, resilientCall } from './gemini/aiClient';
import { logger } from './loggerService';

export interface CreativeAnalysisInput {
  idea: string;
  currentPrompt: string;
  notes?: string;
  target?: string;
  currentVersion?: number;
  cameraDirection?: string;
  lightingStyle?: string;
  neighboringShotSummary?: string;
  language?: string;
}

export class CreativeAssistantService {
  private static instance: CreativeAssistantService;

  static getInstance(): CreativeAssistantService {
    if (!CreativeAssistantService.instance) {
      CreativeAssistantService.instance = new CreativeAssistantService();
    }
    return CreativeAssistantService.instance;
  }

  /**
   * Generates intelligent creative advice based on prompt, current version and user idea.
   * Uses Gemini/Ollama if available, with an instant offline heuristic fallback.
   */
  async generateSuggestions(
    input: CreativeAnalysisInput,
    signal?: AbortSignal,
  ): Promise<CreativeSuggestion[]> {
    const resolvedLang = this.resolveLanguageCode(input.language);
    try {
      const client = await getAiClientAsync();
      if (client) {
        return await this.generateWithAi(input, client, signal);
      }
    } catch (error) {
      logger.info(
        'AI provider unavailable for creative advisory, using heuristic suggestions',
        undefined,
        error,
      );
    }

    await this.ensureLocaleLoaded(resolvedLang);
    return this.generateHeuristicSuggestions(input);
  }

  private resolveLanguageCode(language?: string): string {
    const candidate = (language || i18n.language || 'en').toLowerCase().slice(0, 2);
    return SUPPORTED_LANGUAGES.includes(candidate as SupportedLanguage) ? candidate : 'en';
  }

  private async ensureLocaleLoaded(lang: string): Promise<void> {
    if (
      !SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage) ||
      i18n.hasResourceBundle(lang, 'studio')
    ) {
      return;
    }
    const bundle = await loadLanguageBundle(lang as SupportedLanguage);
    for (const [namespace, resources] of Object.entries(bundle)) {
      i18n.addResourceBundle(lang, namespace, resources, true, true);
    }
  }

  private translateHeuristic(
    key: string,
    lng: string,
    defaultValue: string,
    params?: Record<string, string>,
  ): string {
    return i18n.t(`creativeAssistant.heuristics.${key}`, {
      ns: 'studio',
      lng,
      defaultValue,
      ...(params ?? {}),
    });
  }

  private async generateWithAi(
    input: CreativeAnalysisInput,
    client: NonNullable<Awaited<ReturnType<typeof getAiClientAsync>>>,
    signal?: AbortSignal,
  ): Promise<CreativeSuggestion[]> {
    const systemPrompt = `You are an expert film director and creative visual advisor in Loofi Creator Studio.
Analyze the user's creative idea, current shot prompt, and previous notes.
Provide 3 to 4 concrete, actionable suggestions in these categories:
- 'camera': suggestions to improve camera movement or framing (pan, tilt, tracking shot, Dutch angle, focal depth).
- 'lighting': suggestions to enhance lighting, contrast, or color temperature continuity.
- 'deviation': check if the current prompt deviates from the core concept or lacks essential atmosphere.
- 'iteration-prompt': a natural language instruction ready to be used as a prompt for the next video iteration.

Return valid JSON array of objects conforming to schema:
[
  {
    "category": "camera" | "lighting" | "deviation" | "iteration-prompt",
    "title": "short title",
    "description": "clear explanation of why this improves the scene",
    "suggestedInstruction": "exact text user can apply as next iteration instruction"
  }
]`;

    const userPrompt = `Idea: ${input.idea}
Current Prompt: ${input.currentPrompt}
Previous Notes: ${input.notes || 'None'}
Camera: ${input.cameraDirection || 'Standard'}
Lighting: ${input.lightingStyle || 'Natural'}
Neighboring Storyboard Continuity: ${input.neighboringShotSummary || 'None'}
Current Version: v${input.currentVersion ?? 1}`;

    const model = getPromptModel();
    const response = await resilientCall(
      () =>
        client.models.generateContent({
          model,
          contents: `${systemPrompt}\n\n${userPrompt}`,
          config: {
            responseMimeType: 'application/json',
          },
        }),
      { endpoint: 'gemini-creative-assistant', model, signal },
    );

    const text =
      typeof response?.text === 'string'
        ? response.text
        : response?.candidates?.[0]?.content?.parts?.[0]?.text;
    const resolvedLang = this.resolveLanguageCode(input.language);
    if (!text) {
      await this.ensureLocaleLoaded(resolvedLang);
      return this.generateHeuristicSuggestions(input);
    }

    const parsed = JSON.parse(cleanJson(text));
    if (!Array.isArray(parsed) || parsed.length === 0) {
      await this.ensureLocaleLoaded(resolvedLang);
      return this.generateHeuristicSuggestions(input);
    }

    return parsed.map((item, idx) => ({
      id: `sug-${Date.now()}-${idx}`,
      category: item.category || 'camera',
      title: item.title || 'Creative suggestion',
      description: item.description || '',
      suggestedInstruction: item.suggestedInstruction || '',
      confidence: 'high',
    }));
  }

  /**
   * Deterministic local heuristic analysis for zero-latency, offline operation.
   */
  generateHeuristicSuggestions(input: CreativeAnalysisInput): CreativeSuggestion[] {
    const suggestions: CreativeSuggestion[] = [];
    const prompt = input.currentPrompt.toLowerCase();
    const idea = input.idea.toLowerCase();
    const lng = this.resolveLanguageCode(input.language);

    // 1. Camera & Framing check
    if (!prompt.includes('tracking') && !prompt.includes('dolly') && !prompt.includes('pan')) {
      suggestions.push({
        id: `sug-cam-${Date.now()}-1`,
        category: 'camera',
        title: this.translateHeuristic('cameraAdd.title', lng, 'Add dynamic camera movement'),
        description: this.translateHeuristic(
          'cameraAdd.description',
          lng,
          'A smooth tracking shot or slow dolly push enhances depth perception and kinetic flow.',
        ),
        suggestedInstruction: this.translateHeuristic(
          'cameraAdd.instruction',
          lng,
          'Change the camera movement to a smooth low-angle tracking shot following the main subject.',
        ),
        confidence: 'high',
      });
    } else {
      suggestions.push({
        id: `sug-cam-${Date.now()}-2`,
        category: 'camera',
        title: this.translateHeuristic(
          'cameraRefine.title',
          lng,
          'Refine depth of field and focus',
        ),
        description: this.translateHeuristic(
          'cameraRefine.description',
          lng,
          'A shallower depth of field separates the hero subject cleanly from the background.',
        ),
        suggestedInstruction: this.translateHeuristic(
          'cameraRefine.instruction',
          lng,
          'Pull sharp focus on the subject with creamy bokeh and cinematic background blur.',
        ),
        confidence: 'high',
      });
    }

    // 2. Lighting & Continuity check
    if (
      !prompt.includes('golden hour') &&
      !prompt.includes('neon') &&
      !prompt.includes('volumetric') &&
      !prompt.includes('rim light')
    ) {
      suggestions.push({
        id: `sug-light-${Date.now()}-1`,
        category: 'lighting',
        title: this.translateHeuristic(
          'lightingEnhance.title',
          lng,
          'Enhance lighting and atmosphere',
        ),
        description: this.translateHeuristic(
          'lightingEnhance.description',
          lng,
          'Volumetric lighting and subtle rim light give the scene cinematic presence and texture.',
        ),
        suggestedInstruction: this.translateHeuristic(
          'lightingEnhance.instruction',
          lng,
          'Adjust lighting to golden hour with warm volumetric backlight rays and subtle atmospheric haze.',
        ),
        confidence: 'high',
      });
    } else {
      suggestions.push({
        id: `sug-light-${Date.now()}-2`,
        category: 'lighting',
        title: this.translateHeuristic(
          'lightingContinuity.title',
          lng,
          'Match visual color continuity',
        ),
        description: this.translateHeuristic(
          'lightingContinuity.description',
          lng,
          'Keep color temperature and highlight contrast consistent so the clip cuts seamlessly into neighboring shots.',
        ),
        suggestedInstruction: this.translateHeuristic(
          'lightingContinuity.instruction',
          lng,
          'Preserve the exact color palette and key-light angle to ensure seamless cut continuity.',
        ),
        confidence: 'medium',
      });
    }

    // 3. Idea Deviation Check
    if (
      idea.includes('natt') ||
      idea.includes('mörker') ||
      idea.includes('rain') ||
      idea.includes('regn')
    ) {
      if (!prompt.includes('rain') && !prompt.includes('night') && !prompt.includes('regn')) {
        suggestions.push({
          id: `sug-dev-${Date.now()}`,
          category: 'deviation',
          title: this.translateHeuristic(
            'deviation.title',
            lng,
            'Potential deviation from core idea',
          ),
          description: this.translateHeuristic(
            'deviation.description',
            lng,
            'Your original concept mentioned night/rain, but the current prompt omits explicit weather atmosphere.',
          ),
          suggestedInstruction: this.translateHeuristic(
            'deviation.instruction',
            lng,
            'Add a night setting with rain-slicked streets and reflective neon light sources.',
          ),
          confidence: 'high',
        });
      }
    }

    // 4. Neighboring Storyboard Continuity Check (when Storyboard context is present)
    if (input.neighboringShotSummary?.trim()) {
      const neighbor = input.neighboringShotSummary.trim().slice(0, 60);
      const neighborInstruction = input.neighboringShotSummary.trim().slice(0, 80);
      suggestions.push({
        id: `sug-cont-${Date.now()}`,
        category: 'lighting',
        title: this.translateHeuristic(
          'storyboardContinuity.title',
          lng,
          'Storyboard continuity alignment',
        ),
        description: this.translateHeuristic(
          'storyboardContinuity.description',
          lng,
          `Aligns visual tone with adjacent Storyboard scenes (${neighbor}).`,
          { neighbor },
        ),
        suggestedInstruction: this.translateHeuristic(
          'storyboardContinuity.instruction',
          lng,
          `Match camera pacing, subject scale, and lighting continuity with adjacent scene: ${neighborInstruction}.`,
          { neighbor: neighborInstruction },
        ),
        confidence: 'medium',
      });
    }

    // 5. Ready-to-use Iteration Instruction
    suggestions.push({
      id: `sug-iter-${Date.now()}`,
      category: 'iteration-prompt',
      title: this.translateHeuristic('iterationRefine.title', lng, 'Cinematic micro-refinement'),
      description: this.translateHeuristic(
        'iterationRefine.description',
        lng,
        'Optimized instruction for the next AI iteration of this clip.',
      ),
      suggestedInstruction: this.translateHeuristic(
        'iterationRefine.instruction',
        lng,
        'Enhance cinematic realism with finer atmospheric particles, natural wind movement in hair/fabric, and subtle film grain.',
      ),
      confidence: 'high',
    });

    return suggestions;
  }
}

export const creativeAssistantService = CreativeAssistantService.getInstance();
