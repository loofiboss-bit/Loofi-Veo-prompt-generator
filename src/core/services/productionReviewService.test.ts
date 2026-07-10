import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductionShot, ProductionTake } from '@core/types';

const mockAnalyzeVideo = vi.fn();

vi.mock('@core/services/gemini/geminiVisionService', () => ({
  analyzeVideo: (...args: unknown[]) => mockAnalyzeVideo(...args),
}));

vi.mock('@core/services/loggerService', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { productionReviewService } from './productionReviewService';

const request: ProductionTake['request'] = {
  mode: 'text-to-video',
  modelId: 'veo-3.1-fast-generate-preview',
  prompt: 'A clear tracking shot with dialogue and rain ambience.',
  aspectRatio: '16:9',
  resolution: '720p',
  durationSeconds: 8,
  referenceAssetIds: [],
};

const shot: ProductionShot = {
  id: 1,
  title: 'Shot 1',
  prompt: request.prompt,
  negativePrompt: '',
  camera: 'Tracking shot',
  durationSeconds: 8,
  status: 'reviewing',
  generationRequest: request,
  takes: [],
};

const take: ProductionTake = {
  id: 'take-1',
  prompt: request.prompt,
  request,
  status: 'complete',
  providerMediaUri: 'https://example.com/video.mp4',
  createdAt: 1,
};

describe('productionReviewService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns an advisory local review without a cloud call', async () => {
    const review = await productionReviewService.reviewTake({ shot, take });

    expect(review.source).toBe('local');
    expect(review.dimensions).toHaveLength(5);
    expect(mockAnalyzeVideo).not.toHaveBeenCalled();
  });

  it('merges structured Gemini review when explicitly requested', async () => {
    mockAnalyzeVideo.mockResolvedValue(
      JSON.stringify({
        dimensions: [
          { id: 'prompt-adherence', score: 92, summary: 'The clip follows the prompt.' },
        ],
        findings: [
          { severity: 'warning', category: 'motion', message: 'Motion softens at 4 seconds.' },
        ],
        proposedRevisionPrompt: 'Keep the tracking motion constant.',
      }),
    );

    const review = await productionReviewService.reviewTake({
      shot,
      take,
      video: { data: 'base64', mimeType: 'video/mp4' },
      useGemini: true,
    });

    expect(review.source).toBe('mixed');
    expect(review.findings[0].message).toContain('Motion softens');
    expect(review.proposedRevisionPrompt).toContain('tracking motion');
  });

  it('falls back to local review when Gemini fails', async () => {
    mockAnalyzeVideo.mockRejectedValue(new Error('offline'));
    const review = await productionReviewService.reviewTake({
      shot,
      take,
      video: { data: 'base64', mimeType: 'video/mp4' },
      useGemini: true,
    });
    expect(review.source).toBe('local');
    expect(review.findings[0].message).toContain('unavailable');
  });
});
