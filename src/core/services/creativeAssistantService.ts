import type { CreativeSuggestion } from '@core/types/videoIteration';
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

    return this.generateHeuristicSuggestions(input);
  }

  private async generateWithAi(
    input: CreativeAnalysisInput,
    client: any,
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
    if (!text) return this.generateHeuristicSuggestions(input);

    const parsed = JSON.parse(cleanJson(text));
    if (!Array.isArray(parsed) || parsed.length === 0) {
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

    // 1. Camera & Framing check
    if (!prompt.includes('tracking') && !prompt.includes('dolly') && !prompt.includes('pan')) {
      suggestions.push({
        id: `sug-cam-${Date.now()}-1`,
        category: 'camera',
        title: 'Lägg till dynamisk kamerarörelse',
        description:
          'En mjuk tracking-shot eller långsam dolly framåt förhöjer djupkänslan och rörelsen.',
        suggestedInstruction:
          'Gör om kamerarörelsen till en mjuk low-angle tracking shot som följer huvudmotivet.',
        confidence: 'high',
      });
    } else {
      suggestions.push({
        id: `sug-cam-${Date.now()}-2`,
        category: 'camera',
        title: 'Förfina skärpedjup och fokus',
        description:
          'Ett grundare skärpedjup (shallow depth of field) separerar motivet från bakgrunden.',
        suggestedInstruction:
          'Fokusera skarpt på motivet med mjuk bokeh och cinematisk bakgrundsoskärpa.',
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
        title: 'Förstärk ljussättning och stämning',
        description:
          'Volymetriskt ljus och sidoljus (rim lighting) ger scenen filmisk närvaro och textur.',
        suggestedInstruction:
          'Justera ljussättningen till gyllene timmen med varma motljusstrålar och mjuk rök i luften.',
        confidence: 'high',
      });
    } else {
      suggestions.push({
        id: `sug-light-${Date.now()}-2`,
        category: 'lighting',
        title: 'Matcha visuell färgkontinuitet',
        description:
          'Säkerställ jämn färgton och kontrast i högdagrar så klippet binder sömlöst till nästa scen.',
        suggestedInstruction:
          'Behåll samma färgpalett och ljusvinkel för att säkerställa perfekt klippkontinuitet.',
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
          title: 'Möjlig avvikelse från grundidén',
          description:
            'Din ursprungliga idé nämnde natt/regn, men prompten saknar explicit atmosfäriskt väder.',
          suggestedInstruction:
            'Lägg till nattmiljö med regnvåta gator och reflekterande ljuskällor.',
          confidence: 'high',
        });
      }
    }

    // 4. Ready-to-use Iteration Instruction
    suggestions.push({
      id: `sug-iter-${Date.now()}`,
      category: 'iteration-prompt',
      title: 'Cinematisk finjustering',
      description: 'Optimerad instruktion för nästa AI-iteration av detta klipp.',
      suggestedInstruction:
        'Förstärk den cinematiska realismen med finare partiklar, naturlig vind i hår/kläder och subtil filmkornighet.',
      confidence: 'high',
    });

    return suggestions;
  }
}

export const creativeAssistantService = CreativeAssistantService.getInstance();
