import { describe, expect, it, vi, beforeEach } from 'vitest';
import { videoIterationService } from './videoIterationService';
import type { VideoIterationSession } from '@core/types/videoIteration';

vi.mock('@core/models/catalog', () => ({
  getModel: vi.fn((id: string) => ({
    id,
    displayName: 'Gemini Omni 1.1 Flash',
    pricing: {
      status: 'priced',
      billingModes: ['video-seconds'],
      videoPerSecondByResolutionUsd: {
        '720p': 0.1,
        '1080p': 0.23,
        '4k': 0.91,
      },
      source: { sourceUrl: 'https://test', verifiedDate: '2026-08-01' },
    },
    capabilities: {
      operations: ['video', 'video-edit'],
      supportedDurationsSeconds: [3, 4, 5, 6, 7, 8, 9, 10],
      supportedResolutions: ['360p', '720p', '1080p', '4k'],
      supportedAspectRatios: ['16:9', '9:16'],
    },
  })),
}));

vi.mock('@core/models/cost', () => ({
  estimateMaximumModelCost: vi.fn(() => ({
    maximumChargeUsd: 0.8,
    currency: 'USD',
    confidence: 'upper-bound',
  })),
}));

vi.mock('./mediaAssetService', () => ({
  mediaAssetService: {
    storeBlob: vi.fn().mockResolvedValue({}),
    getObjectUrl: vi.fn().mockResolvedValue('blob:test-iteration-url'),
  },
}));

vi.mock('idb-keyval', () => ({
  createStore: vi.fn(() => ({})),
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue(undefined),
}));

describe('videoIterationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validates settings and enforces limits for Gemini Omni 1.1 Flash', () => {
    const valid = videoIterationService.validateSettings({
      durationSeconds: 6,
      resolution: '1080p',
      aspectRatio: '16:9',
    });
    expect(valid.durationSeconds).toBe(6);
    expect(valid.resolution).toBe('1080p');
    expect(valid.aspectRatio).toBe('16:9');
    expect(valid.modelId).toBe('gemini-omni-1.1-flash');

    expect(() => videoIterationService.validateSettings({ durationSeconds: 15 as any })).toThrow(
      /between 3 and 10 seconds/,
    );

    expect(() => videoIterationService.validateSettings({ resolution: '8k' as any })).toThrow(
      /Unsupported resolution/,
    );

    expect(() => videoIterationService.validateSettings({ aspectRatio: '4:3' as any })).toThrow(
      /Unsupported aspect ratio/,
    );
  });

  it('calculates cost estimates for iterations accurately', () => {
    const estimate = videoIterationService.estimateIterationCost({
      durationSeconds: 8,
      resolution: '720p',
    });
    expect(estimate.maximumChargeUsd).toBe(0.8);
    expect(estimate.confidence).toBe('upper-bound');
    expect(estimate.modelId).toBe('gemini-omni-1.1-flash');
  });

  it('creates an initial session with version 1 from a base video', () => {
    const session = videoIterationService.createInitialSession({
      projectId: 'proj-1',
      artifactId: 'art-1',
      variantIndex: 0,
      baseAsset: { id: 'asset-orig', url: 'https://example.com/base.mp4' },
      initialPrompt: 'A cat walking in the rain',
      interactionId: 'interaction-101',
    });

    expect(session.projectId).toBe('proj-1');
    expect(session.turns).toHaveLength(1);
    expect(session.turns[0].version).toBe(1);
    expect(session.turns[0].assetId).toBe('asset-orig');
    expect(session.turns[0].interactionId).toBe('interaction-101');
    expect(session.activeTurnId).toBe(session.turns[0].id);
  });

  it('performs iteration using natural language instruction and creates version 2', async () => {
    const session: VideoIterationSession = videoIterationService.createInitialSession({
      projectId: 'proj-1',
      artifactId: 'art-1',
      variantIndex: 0,
      baseAsset: { id: 'asset-orig', url: 'https://example.com/base.mp4' },
      initialPrompt: 'A cat walking in the rain',
      interactionId: 'interaction-101',
    });

    const result = await videoIterationService.iterateVideo({
      session,
      projectId: 'proj-1',
      artifactId: 'art-1',
      variantIndex: 0,
      instruction: 'Add neon lights reflecting in puddles',
    });

    expect(result.session.turns).toHaveLength(2);
    expect(result.turn.version).toBe(2);
    expect(result.turn.parentId).toBe(session.turns[0].id);
    expect(result.turn.instruction).toBe('Add neon lights reflecting in puddles');
    expect(result.session.activeTurnId).toBe(result.turn.id);
  });

  it('rejects empty instructions', async () => {
    const session = videoIterationService.createInitialSession({
      projectId: 'proj-1',
      artifactId: 'art-1',
      variantIndex: 0,
      baseAsset: { id: 'asset-orig' },
      initialPrompt: 'Initial prompt',
    });

    await expect(
      videoIterationService.iterateVideo({
        session,
        projectId: 'proj-1',
        artifactId: 'art-1',
        variantIndex: 0,
        instruction: '   ',
      }),
    ).rejects.toThrow(/Please enter instructions/);
  });
});
