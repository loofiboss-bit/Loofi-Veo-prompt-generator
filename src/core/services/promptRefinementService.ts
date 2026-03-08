import {
  getAiClient,
  getPromptModel,
  cleanJson,
  resilientCall,
} from '@core/services/gemini/aiClient';
import { getStoredApiKey } from '@core/services/apiKeyService';
import { logger } from '@core/services/loggerService';
import type { PromptSuggestion, SuggestionCategory } from '@core/types';
import {
  STYLE_KEYWORDS,
  CAMERA_KEYWORDS,
  LIGHTING_KEYWORDS,
  MIN_PROMPT_LENGTH,
  OPTIMAL_PROMPT_LENGTH_MAX,
  SUGGESTION_CONFIDENCE_THRESHOLD,
  CACHE_TTL_MS,
  CACHE_MAX_ENTRIES,
} from '@core/constants/optimizationRules';

interface CacheEntry {
  suggestions: PromptSuggestion[];
  timestamp: number;
}

class PromptRefinementService {
  private static instance: PromptRefinementService;
  private cache = new Map<string, CacheEntry>();
  private abortController: AbortController | null = null;

  static getInstance(): PromptRefinementService {
    if (!PromptRefinementService.instance) {
      PromptRefinementService.instance = new PromptRefinementService();
    }
    return PromptRefinementService.instance;
  }

  /**
   * Analyze a prompt and return improvement suggestions.
   * Uses Gemini API if available, falls back to local heuristics.
   */
  async analyzePrompt(promptText: string, promptId: string): Promise<PromptSuggestion[]> {
    if (!promptText.trim()) return [];

    // Check cache
    const cacheKey = this.hashPrompt(promptText);
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    // Cancel any pending request
    this.cancelPending();

    let suggestions: PromptSuggestion[];

    // Try Gemini API if key is available
    const apiKey = getStoredApiKey();
    if (apiKey) {
      try {
        suggestions = await this.analyzeWithGemini(promptText, promptId);
      } catch (error) {
        logger.warn('Gemini analysis failed, falling back to heuristics', { error });
        suggestions = this.analyzeWithHeuristics(promptText, promptId);
      }
    } else {
      suggestions = this.analyzeWithHeuristics(promptText, promptId);
    }

    // Filter by confidence threshold
    suggestions = suggestions.filter((s) => s.confidence >= SUGGESTION_CONFIDENCE_THRESHOLD);

    // Cache results
    this.setCache(cacheKey, suggestions);

    return suggestions;
  }

  /** Cancel any pending Gemini analysis */
  cancelPending(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /** Clear the response cache */
  clearCache(): void {
    this.cache.clear();
  }

  private async analyzeWithGemini(
    promptText: string,
    promptId: string,
  ): Promise<PromptSuggestion[]> {
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    const ai = getAiClient();
    const modelName = getPromptModel();

    // RAI-ADR-001 §1: Neutral technical framing, no cultural value judgments
    const systemPrompt = `You are a technical video prompt analysis assistant. Analyze the given video generation prompt and suggest specific improvements.

Rules:
- Focus on technical additions that increase specificity and generation quality
- Categories: style, camera, lighting, specificity, syntax
- Provide neutral, technical suggestions without cultural or aesthetic value judgments
- Frame suggestions as additions or clarifications, not corrections
- Each suggestion must include reasoning explaining the technical benefit

Return a JSON array of suggestions:
[{
  "category": "style|camera|lighting|specificity|syntax",
  "original": "relevant portion of the original prompt",
  "suggested": "the improved version of that portion",
  "reasoning": "why this improves generation quality",
  "confidence": 0.0-1.0
}]

Only return the JSON array, no other text.`;

    const response = await resilientCall(
      () =>
        ai.models.generateContent({
          model: modelName,
          contents: `Analyze this video prompt and suggest improvements:\n\n${promptText}`,
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.3,
          },
        }),
      { endpoint: 'optimization-prompt-refinement', model: modelName },
    );

    // Check if aborted
    if (signal.aborted) return [];

    const text = response.text ?? '';
    const jsonStr = cleanJson(text);

    try {
      const parsed = JSON.parse(jsonStr);
      if (!Array.isArray(parsed)) return [];

      return parsed
        .filter(
          (item: Record<string, unknown>) =>
            item.category &&
            item.suggested &&
            item.reasoning &&
            typeof item.confidence === 'number',
        )
        .map((item: Record<string, unknown>, index: number) => ({
          id: `${promptId}-ai-${index}`,
          promptId,
          category: item.category as SuggestionCategory,
          original: (item.original as string) || '',
          suggested: item.suggested as string,
          reasoning: item.reasoning as string,
          status: 'pending' as const,
          confidence: item.confidence as number,
          source: 'ai' as const,
        }));
    } catch {
      logger.warn('Failed to parse Gemini suggestion response');
      return [];
    }
  }

  /**
   * Local heuristic analysis — runs when Gemini is unavailable.
   * RAI-ADR-001 §3: structural-only analysis, no keyword matching bias.
   */
  analyzeWithHeuristics(promptText: string, promptId: string): PromptSuggestion[] {
    const suggestions: PromptSuggestion[] = [];
    const lower = promptText.toLowerCase();
    let idCounter = 0;

    const makeSuggestion = (
      category: SuggestionCategory,
      original: string,
      suggested: string,
      reasoning: string,
      confidence: number,
    ): PromptSuggestion => ({
      id: `${promptId}-heuristic-${idCounter++}`,
      promptId,
      category,
      original,
      suggested,
      reasoning,
      status: 'pending',
      confidence,
      source: 'heuristic',
    });

    // Check prompt length
    if (promptText.length < MIN_PROMPT_LENGTH) {
      suggestions.push(
        makeSuggestion(
          'specificity',
          promptText,
          `${promptText} [add more detail about environment, lighting, and camera angle]`,
          'Longer, more detailed prompts typically produce higher quality video generations',
          0.8,
        ),
      );
    } else if (promptText.length > OPTIMAL_PROMPT_LENGTH_MAX) {
      suggestions.push(
        makeSuggestion(
          'syntax',
          promptText.substring(0, 50) + '...',
          'Consider splitting into focused scenes',
          'Very long prompts may lose focus. Consider breaking into multiple scenes for better results',
          0.5,
        ),
      );
    }

    // Check for camera movement keywords
    const hasCameraKeyword = CAMERA_KEYWORDS.some((kw) => lower.includes(kw));
    if (!hasCameraKeyword && promptText.length >= MIN_PROMPT_LENGTH) {
      suggestions.push(
        makeSuggestion(
          'camera',
          '',
          'Consider adding a camera movement (e.g., "slow dolly in", "tracking shot", "static wide shot")',
          'Specifying camera movement gives the AI model clearer direction for motion',
          0.7,
        ),
      );
    }

    // Check for lighting keywords
    const hasLightingKeyword = LIGHTING_KEYWORDS.some((kw) => lower.includes(kw));
    if (!hasLightingKeyword && promptText.length >= MIN_PROMPT_LENGTH) {
      suggestions.push(
        makeSuggestion(
          'lighting',
          '',
          'Consider adding lighting details (e.g., "golden hour lighting", "dramatic shadows", "soft ambient light")',
          'Lighting descriptions significantly improve visual consistency in generated video',
          0.6,
        ),
      );
    }

    // Check for style keywords
    const hasStyleKeyword = STYLE_KEYWORDS.some((kw) => lower.includes(kw));
    if (!hasStyleKeyword && promptText.length >= MIN_PROMPT_LENGTH) {
      suggestions.push(
        makeSuggestion(
          'style',
          '',
          'Consider adding a visual style (e.g., "cinematic", "photorealistic", "anime style")',
          'A defined visual style helps the model produce more consistent and intentional results',
          0.6,
        ),
      );
    }

    return suggestions;
  }

  private hashPrompt(text: string): string {
    // Simple hash for cache key
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32-bit integer
    }
    return `prompt-${hash}`;
  }

  private getCached(key: string): PromptSuggestion[] | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      this.cache.delete(key);
      return null;
    }
    return entry.suggestions;
  }

  private setCache(key: string, suggestions: PromptSuggestion[]): void {
    // LRU eviction
    if (this.cache.size >= CACHE_MAX_ENTRIES) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, { suggestions, timestamp: Date.now() });
  }
}

export const promptRefinementService = PromptRefinementService.getInstance();
