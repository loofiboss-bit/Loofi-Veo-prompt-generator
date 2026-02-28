import { getAiClient, cleanJson, resilientCall } from '@core/services/gemini/aiClient';
import { getStoredApiKey } from '@core/services/apiKeyService';
import { logger } from '@core/services/loggerService';
import type { AssetTag, AssetTagCategory } from '@core/types';
import { CACHE_TTL_MS, CACHE_MAX_ENTRIES } from '@core/constants/optimizationRules';

interface CacheEntry {
  tags: AssetTag[];
  timestamp: number;
}

class AssetIntelligenceService {
  private static instance: AssetIntelligenceService;
  private cache = new Map<string, CacheEntry>();

  static getInstance(): AssetIntelligenceService {
    if (!AssetIntelligenceService.instance) {
      AssetIntelligenceService.instance = new AssetIntelligenceService();
    }
    return AssetIntelligenceService.instance;
  }

  /**
   * Analyze an image/video asset and extract structured metadata tags.
   * Falls back to empty results when Gemini Vision is unavailable.
   */
  async analyzeAsset(assetId: string, dataUrl: string): Promise<AssetTag[]> {
    if (!dataUrl) return [];

    // Check cache
    const cached = this.getCached(assetId);
    if (cached) return cached;

    const apiKey = getStoredApiKey();
    if (!apiKey) {
      logger.info('No API key — skipping asset intelligence analysis');
      return [];
    }

    try {
      const tags = await this.analyzeWithGeminiVision(assetId, dataUrl);
      this.setCache(assetId, tags);
      return tags;
    } catch (error) {
      logger.warn('Asset intelligence analysis failed', { error, assetId });
      return [];
    }
  }

  /** Generate tags from a text description instead of an image (fallback) */
  generateTagsFromDescription(assetId: string, description: string): AssetTag[] {
    if (!description.trim()) return [];

    const tags: AssetTag[] = [];
    const lower = description.toLowerCase();
    let idCounter = 0;

    const makeTag = (label: string, category: AssetTagCategory, confidence: number): AssetTag => ({
      id: `${assetId}-desc-${idCounter++}`,
      assetId,
      label,
      category,
      confidence,
      source: 'manual',
    });

    // Basic scene detection
    const sceneKeywords: Record<string, string> = {
      indoor: 'indoor',
      outdoor: 'outdoor',
      urban: 'urban',
      nature: 'nature',
      studio: 'studio',
      underwater: 'underwater',
      space: 'space',
      forest: 'forest',
      desert: 'desert',
      city: 'city',
    };
    for (const [keyword, label] of Object.entries(sceneKeywords)) {
      if (lower.includes(keyword)) {
        tags.push(makeTag(label, 'scene', 0.7));
      }
    }

    // Basic mood detection
    const moodKeywords: Record<string, string> = {
      happy: 'happy',
      sad: 'sad',
      dramatic: 'dramatic',
      peaceful: 'peaceful',
      tense: 'tense',
      mysterious: 'mysterious',
      energetic: 'energetic',
      melancholic: 'melancholic',
    };
    for (const [keyword, label] of Object.entries(moodKeywords)) {
      if (lower.includes(keyword)) {
        tags.push(makeTag(label, 'mood', 0.6));
      }
    }

    return tags;
  }

  clearCache(): void {
    this.cache.clear();
  }

  private async analyzeWithGeminiVision(assetId: string, dataUrl: string): Promise<AssetTag[]> {
    const ai = getAiClient();

    // RAI-ADR-001 §2: No demographic identification, neutral vocabulary
    const systemPrompt = `You are a visual content analysis assistant for video production.

Analyze the provided image and extract structured metadata tags.

Rules:
- Describe visual elements only (objects, colors, settings, composition)
- Do NOT identify individuals by ethnicity, race, gender, or age
- Use neutral descriptive vocabulary (e.g., "person in red jacket" not demographic descriptions)
- Categories: scene, mood, subject, palette, location
- Each tag must have a confidence score (0.0-1.0)

Return a JSON array:
[{
  "label": "descriptive tag text",
  "category": "scene|mood|subject|palette|location",
  "confidence": 0.0-1.0
}]

Only return the JSON array.`;

    // Extract base64 and mime type from data URL
    const mimeMatch = dataUrl.match(/^data:([^;]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const base64Data = dataUrl.replace(/^data:[^;]+;base64,/, '');

    const response = await resilientCall(
      () =>
        ai.models.generateContent({
          model: 'gemini-3.1-pro-preview',
          contents: [
            {
              role: 'user',
              parts: [
                { inlineData: { mimeType, data: base64Data } },
                { text: 'Analyze this image and extract metadata tags for video production.' },
              ],
            },
          ],
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.2,
          },
        }),
      { endpoint: 'optimization-asset-intelligence', model: 'gemini-3.1-pro-preview' },
    );

    const text = response.text ?? '';
    const jsonStr = cleanJson(text);

    try {
      const parsed = JSON.parse(jsonStr);
      if (!Array.isArray(parsed)) return [];

      return parsed
        .filter(
          (item: Record<string, unknown>) =>
            item.label && item.category && typeof item.confidence === 'number',
        )
        .map((item: Record<string, unknown>, index: number) => ({
          id: `${assetId}-ai-${index}`,
          assetId,
          label: item.label as string,
          category: item.category as AssetTagCategory,
          confidence: item.confidence as number,
          source: 'ai' as const,
        }));
    } catch {
      logger.warn('Failed to parse Gemini Vision response for asset analysis');
      return [];
    }
  }

  private getCached(key: string): AssetTag[] | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      this.cache.delete(key);
      return null;
    }
    return entry.tags;
  }

  private setCache(key: string, tags: AssetTag[]): void {
    if (this.cache.size >= CACHE_MAX_ENTRIES) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, { tags, timestamp: Date.now() });
  }
}

export const assetIntelligenceService = AssetIntelligenceService.getInstance();
