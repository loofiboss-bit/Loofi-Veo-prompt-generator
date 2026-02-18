import { logger } from '@core/services/loggerService';
import type { OptimizationCostEstimate, QualityDimension } from '@core/types';
import {
  QUALITY_WEIGHTS,
  STYLE_KEYWORDS,
  CAMERA_KEYWORDS,
  LIGHTING_KEYWORDS,
  MIN_PROMPT_LENGTH,
  OPTIMAL_PROMPT_LENGTH_MIN,
  OPTIMAL_PROMPT_LENGTH_MAX,
} from '@core/constants/optimizationRules';

// Cost per generation by model (USD estimates)
const MODEL_GENERATION_COSTS: Record<string, number> = {
  veo: 0.05,
  sora: 0.08,
};

class CostEstimationService {
  private static instance: CostEstimationService;

  static getInstance(): CostEstimationService {
    if (!CostEstimationService.instance) {
      CostEstimationService.instance = new CostEstimationService();
    }
    return CostEstimationService.instance;
  }

  /**
   * Estimate cost and quality score for a prompt.
   * RAI-ADR-001 §3: Scoring breakdown fully transparent, length weight ≤ 20%.
   */
  estimateForPrompt(
    promptText: string,
    promptId: string,
    modelId: string = 'veo',
  ): OptimizationCostEstimate {
    const breakdown = this.calculateQualityBreakdown(promptText);
    const qualityScore = this.calculateOverallScore(breakdown);
    const estimatedUsd = this.estimateCost(modelId, qualityScore);

    return {
      promptId,
      modelId,
      estimatedUsd,
      qualityScore,
      breakdown,
    };
  }

  /**
   * Calculate quality dimensions for a prompt.
   */
  calculateQualityBreakdown(promptText: string): QualityDimension[] {
    const lower = promptText.toLowerCase();

    return [
      this.scoreSpecificity(promptText, lower),
      this.scoreStyle(lower),
      this.scoreCamera(lower),
      this.scoreLighting(lower),
      this.scoreLength(promptText),
      this.scoreSyntax(promptText),
    ];
  }

  /**
   * Calculate overall quality score (1-10) from breakdown.
   */
  calculateOverallScore(breakdown: QualityDimension[]): number {
    const weightedSum = breakdown.reduce((sum, dim) => sum + dim.score * dim.weight, 0);
    // Clamp to 1-10
    return Math.max(1, Math.min(10, Math.round(weightedSum * 10) / 10));
  }

  private scoreSpecificity(text: string, lower: string): QualityDimension {
    let score = 0;
    // Count specific details (numbers, adjectives, proper nouns)
    const wordCount = text.trim().split(/\s+/).length;
    if (wordCount > 10) score += 2;
    if (wordCount > 20) score += 2;
    if (wordCount > 40) score += 1;
    // Check for descriptive detail markers
    if (/\d+/.test(text)) score += 1; // Contains numbers
    if (lower.includes('wearing') || lower.includes('holding')) score += 1;
    if (lower.includes('background') || lower.includes('foreground')) score += 1;
    if (lower.includes('detailed') || lower.includes('specific')) score += 1;
    score = Math.min(10, score);

    return {
      name: 'specificity',
      score,
      weight: QUALITY_WEIGHTS.specificity,
      feedback:
        score >= 7
          ? 'Good level of detail and specificity'
          : 'Consider adding more specific details about subjects, environment, and composition',
    };
  }

  private scoreStyle(lower: string): QualityDimension {
    const matchCount = STYLE_KEYWORDS.filter((kw) => lower.includes(kw)).length;
    const score = Math.min(10, matchCount * 3 + (matchCount > 0 ? 2 : 0));

    return {
      name: 'style',
      score,
      weight: QUALITY_WEIGHTS.style,
      feedback:
        score >= 5
          ? 'Visual style is well defined'
          : 'Consider specifying a visual style (e.g., cinematic, photorealistic, anime)',
    };
  }

  private scoreCamera(lower: string): QualityDimension {
    const matchCount = CAMERA_KEYWORDS.filter((kw) => lower.includes(kw)).length;
    const score = Math.min(10, matchCount * 4 + (matchCount > 0 ? 3 : 0));

    return {
      name: 'camera',
      score,
      weight: QUALITY_WEIGHTS.camera,
      feedback:
        score >= 5
          ? 'Camera movement is well specified'
          : 'Consider adding camera direction (e.g., tracking shot, dolly in, static wide)',
    };
  }

  private scoreLighting(lower: string): QualityDimension {
    const matchCount = LIGHTING_KEYWORDS.filter((kw) => lower.includes(kw)).length;
    const score = Math.min(10, matchCount * 4 + (matchCount > 0 ? 3 : 0));

    return {
      name: 'lighting',
      score,
      weight: QUALITY_WEIGHTS.lighting,
      feedback:
        score >= 5
          ? 'Lighting is well described'
          : 'Consider adding lighting details (e.g., golden hour, dramatic shadows)',
    };
  }

  private scoreLength(text: string): QualityDimension {
    const len = text.length;
    let score = 0;
    if (len < MIN_PROMPT_LENGTH) {
      score = 2;
    } else if (len >= OPTIMAL_PROMPT_LENGTH_MIN && len <= OPTIMAL_PROMPT_LENGTH_MAX) {
      score = 10;
    } else if (len > OPTIMAL_PROMPT_LENGTH_MAX) {
      score = 6;
    } else {
      // Between MIN and OPTIMAL_MIN
      score =
        4 +
        Math.floor(
          ((len - MIN_PROMPT_LENGTH) / (OPTIMAL_PROMPT_LENGTH_MIN - MIN_PROMPT_LENGTH)) * 6,
        );
    }

    return {
      name: 'length',
      score: Math.min(10, score),
      weight: QUALITY_WEIGHTS.length, // ≤ 0.10 per RAI-ADR-001
      feedback:
        len < MIN_PROMPT_LENGTH
          ? 'Prompt is too short — add more detail for better results'
          : len > OPTIMAL_PROMPT_LENGTH_MAX
            ? 'Prompt is quite long — consider focusing on key elements'
            : 'Prompt length is in the optimal range',
    };
  }

  private scoreSyntax(text: string): QualityDimension {
    let score = 5; // Start at neutral
    // Check for sentence structure
    if (/[.!]/.test(text)) score += 1;
    // Check for comma-separated details
    if (text.includes(',')) score += 1;
    // Penalize all-caps
    if (text === text.toUpperCase() && text.length > 10) score -= 2;
    // Penalize excessive exclamation
    if ((text.match(/!/g) || []).length > 3) score -= 1;
    // Bonus for well-structured prompt
    if (text.includes('.') && text.includes(',') && text.length > MIN_PROMPT_LENGTH) score += 2;
    score = Math.max(0, Math.min(10, score));

    return {
      name: 'syntax',
      score,
      weight: QUALITY_WEIGHTS.syntax,
      feedback:
        score >= 6
          ? 'Syntax and structure look good'
          : 'Consider using clear, well-punctuated sentences for better parsing',
    };
  }

  private estimateCost(modelId: string, qualityScore: number): number {
    const baseCost = MODEL_GENERATION_COSTS[modelId] ?? 0.05;
    // Higher quality prompts may lead to fewer retries, slightly lower effective cost
    const qualityMultiplier = 1 - (qualityScore - 5) * 0.02;
    return Math.max(0.01, Math.round(baseCost * qualityMultiplier * 100) / 100);
  }
}

export const costEstimationService = CostEstimationService.getInstance();
