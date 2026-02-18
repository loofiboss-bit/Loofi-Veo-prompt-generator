import type { PresetRecommendation } from '@core/types';

// Model capability profiles
const MODEL_PROFILES: Record<
  string,
  { displayName: string; strengths: string[]; maxComplexity: number }
> = {
  'veo-3.1-quality': {
    displayName: 'Veo 3.1 (Quality)',
    strengths: ['cinematic', 'photorealistic', 'high-detail', 'complex-scenes'],
    maxComplexity: 1.0,
  },
  'veo-3.1-fast': {
    displayName: 'Veo 3.1 (Fast)',
    strengths: ['simple-scenes', 'quick-iteration', 'prototyping'],
    maxComplexity: 0.5,
  },
  'sora-turbo': {
    displayName: 'Sora Turbo',
    strengths: ['creative', 'abstract', 'artistic', 'experimental'],
    maxComplexity: 0.8,
  },
};

// Export preset profiles
const EXPORT_PRESETS: Record<string, { resolution: string; fps: number; quality: string }> = {
  'web-standard': { resolution: '1080p', fps: 30, quality: 'balanced' },
  'web-high': { resolution: '1080p', fps: 60, quality: 'high' },
  'cinema-4k': { resolution: '4K', fps: 24, quality: 'maximum' },
  'social-vertical': { resolution: '1080x1920', fps: 30, quality: 'balanced' },
  draft: { resolution: '720p', fps: 24, quality: 'draft' },
};

class PresetMatchingService {
  private static instance: PresetMatchingService;

  static getInstance(): PresetMatchingService {
    if (!PresetMatchingService.instance) {
      PresetMatchingService.instance = new PresetMatchingService();
    }
    return PresetMatchingService.instance;
  }

  /**
   * Recommend model + export preset based on prompt content analysis.
   * RAI-ADR-001 §5: Transparent reasoning, frictionless override, "optimized for" framing.
   */
  recommendPreset(promptText: string, _promptId: string): PresetRecommendation {
    const complexityVector = this.analyzeComplexity(promptText);
    const overallComplexity = this.calculateOverallComplexity(complexityVector);

    // Score each model profile
    const scores = Object.entries(MODEL_PROFILES).map(([modelId, profile]) => ({
      modelId,
      profile,
      score: this.scoreModelFit(complexityVector, overallComplexity, profile),
    }));

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);
    const best = scores[0];

    // Select export preset based on complexity
    const profileId = this.selectExportPreset(overallComplexity);

    // Build reasoning (RAI: transparent, "optimized for" framing)
    const reasoning = this.buildReasoning(complexityVector, best.modelId, best.profile, profileId);

    return {
      modelId: best.modelId,
      profileId,
      confidence: Math.min(1, best.score),
      reasoning,
      complexityVector,
    };
  }

  /**
   * Analyze prompt complexity across multiple dimensions.
   */
  analyzeComplexity(promptText: string): Record<string, number> {
    const lower = promptText.toLowerCase();
    const words = promptText.trim().split(/\s+/);

    return {
      length: Math.min(1, words.length / 100),
      detail: this.measureDetail(lower),
      motion: this.measureMotion(lower),
      style: this.measureStyleComplexity(lower),
      composition: this.measureComposition(lower),
    };
  }

  private calculateOverallComplexity(vector: Record<string, number>): number {
    const values = Object.values(vector);
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  private scoreModelFit(
    vector: Record<string, number>,
    complexity: number,
    profile: { strengths: string[]; maxComplexity: number },
  ): number {
    // Base score: how well the complexity matches the model's range
    const complexityFit = 1 - Math.abs(complexity - profile.maxComplexity * 0.7);

    // Bonus for matching strengths
    let strengthBonus = 0;
    for (const strength of profile.strengths) {
      if (vector[strength] !== undefined) {
        strengthBonus += vector[strength] * 0.1;
      }
    }

    return Math.max(0, Math.min(1, complexityFit + strengthBonus));
  }

  private selectExportPreset(complexity: number): string {
    if (complexity > 0.7) return 'cinema-4k';
    if (complexity > 0.5) return 'web-high';
    if (complexity > 0.3) return 'web-standard';
    return 'draft';
  }

  private buildReasoning(
    vector: Record<string, number>,
    modelId: string,
    profile: { displayName: string; strengths: string[] },
    presetId: string,
  ): string[] {
    const reasons: string[] = [];
    const preset = EXPORT_PRESETS[presetId];

    reasons.push(`${profile.displayName} is optimized for your prompt's complexity profile`);

    if (vector.motion > 0.5) {
      reasons.push('High motion complexity detected — this model handles camera movements well');
    }
    if (vector.style > 0.5) {
      reasons.push('Rich visual style specification — this model excels at style interpretation');
    }
    if (vector.detail > 0.6) {
      reasons.push(
        'Detailed prompt with many specific elements — higher capability model recommended',
      );
    }
    if (preset) {
      reasons.push(
        `Export preset: ${preset.resolution} at ${preset.fps}fps (${preset.quality} quality)`,
      );
    }

    return reasons;
  }

  private measureDetail(lower: string): number {
    const detailIndicators = [
      'wearing',
      'holding',
      'standing',
      'sitting',
      'running',
      'background',
      'foreground',
      'left',
      'right',
      'center',
      'red',
      'blue',
      'green',
      'gold',
      'silver',
      'white',
      'black',
      'small',
      'large',
      'tall',
      'short',
      'wide',
      'narrow',
    ];
    const count = detailIndicators.filter((d) => lower.includes(d)).length;
    return Math.min(1, count / 6);
  }

  private measureMotion(lower: string): number {
    const motionKeywords = [
      'moving',
      'running',
      'flying',
      'spinning',
      'rotating',
      'pan',
      'tilt',
      'dolly',
      'zoom',
      'tracking',
      'orbit',
      'slow motion',
      'time lapse',
      'handheld',
      'steadicam',
    ];
    const count = motionKeywords.filter((m) => lower.includes(m)).length;
    return Math.min(1, count / 4);
  }

  private measureStyleComplexity(lower: string): number {
    const styleIndicators = [
      'cinematic',
      'photorealistic',
      'anime',
      'watercolor',
      'noir',
      'vintage',
      'futuristic',
      'surreal',
      'abstract',
      'dramatic',
      'ethereal',
      'gritty',
      'minimalist',
    ];
    const count = styleIndicators.filter((s) => lower.includes(s)).length;
    return Math.min(1, count / 3);
  }

  private measureComposition(lower: string): number {
    const compositionIndicators = [
      'close-up',
      'wide shot',
      'medium shot',
      'aerial',
      'overhead',
      'low angle',
      'high angle',
      'symmetr',
      'rule of thirds',
      'framing',
      'depth of field',
    ];
    const count = compositionIndicators.filter((c) => lower.includes(c)).length;
    return Math.min(1, count / 3);
  }
}

export const presetMatchingService = PresetMatchingService.getInstance();
