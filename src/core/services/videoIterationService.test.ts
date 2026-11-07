import { describe, expect, it, vi, beforeEach } from 'vitest';
import { videoIterationService } from './videoIterationService';
import type { VideoIterationSession } from '@core/types/videoIteration';
import { get } from 'idb-keyval';
import { mediaAssetService } from './mediaAssetService';

vi.mock('@core/models/catalog', () => ({
  getModel: vi.fn((id: string) => ({
    id,
    displayName: id === 'gemini-omni-1.1-flash' ? 'Gemini Omni 1.1 Flash' : 'Gemini Omni 1.2 Flash',
    pricing: {
      status: 'priced',
      billingModes: ['tokens', 'video-seconds'],
      inputPerMillionUsd: 0.75,
      outputPerMillionUsd: 4.5,
      videoOutputTokensPerSecondByResolution: {
        '360p': 4334,
        '720p': 17334,
        '1080p': 39000,
        '4k': 156000,
      },
      source: { sourceUrl: 'https://test', verifiedDate: '2026-10-29' },
    },
    capabilities: {
      operations: ['video', 'video-edit'],
      supportedDurationsSeconds:
        id === 'gemini-omni-1.1-flash'
          ? [3, 4, 5, 6, 7, 8, 9, 10]
          : [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
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
    getRecord: vi.fn().mockResolvedValue(null),
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

  it('validates settings and enforces limits for Gemini Omni 1.2 Flash (3-15s edit, 3-10s extend)', () => {
    const validEdit = videoIterationService.validateSettings({
      durationSeconds: 15,
      resolution: '1080p',
      aspectRatio: '16:9',
      mode: 'edit',
    });
    expect(validEdit.durationSeconds).toBe(15);
    expect(validEdit.resolution).toBe('1080p');
    expect(validEdit.aspectRatio).toBe('16:9');
    expect(validEdit.modelId).toBe('gemini-omni-1.2-flash');
    expect(validEdit.mode).toBe('edit');
    expect(validEdit.keepAudio).toBe(true);

    expect(() =>
      videoIterationService.validateSettings({ durationSeconds: 16 as unknown as number }),
    ).toThrow(/between 3 and 15 seconds/);

    expect(() =>
      videoIterationService.validateSettings({
        durationSeconds: 12,
        mode: 'extend',
      }),
    ).toThrow(/between 3 and 10 seconds/);

    expect(() =>
      videoIterationService.validateSettings({ resolution: '8k' as unknown as '4k' }),
    ).toThrow(/Unsupported resolution/);

    expect(() =>
      videoIterationService.validateSettings({ aspectRatio: '4:3' as unknown as '16:9' }),
    ).toThrow(/Unsupported aspect ratio/);
  });

  it('calculates cost estimates for iterations accurately with estimatedInputTokens', () => {
    const estimate = videoIterationService.estimateIterationCost({
      durationSeconds: 8,
      resolution: '720p',
    });
    expect(estimate.maximumChargeUsd).toBe(0.8);
    expect(estimate.confidence).toBe('upper-bound');
    expect(estimate.modelId).toBe('gemini-omni-1.2-flash');
    expect(estimate.estimatedInputTokens).toBeGreaterThanOrEqual(1000);
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

  it('maintains strictly sequential version numbers (v1, v2, v3) even when branching from v1', async () => {
    const session: VideoIterationSession = videoIterationService.createInitialSession({
      projectId: 'proj-1',
      artifactId: 'art-1',
      variantIndex: 0,
      baseAsset: { id: 'asset-orig', url: 'https://example.com/base.mp4' },
      initialPrompt: 'A cat walking in the rain',
      interactionId: 'interaction-101',
    });

    const turn2Result = await videoIterationService.iterateVideo({
      session,
      projectId: 'proj-1',
      artifactId: 'art-1',
      variantIndex: 0,
      instruction: 'Add neon lights reflecting in puddles',
    });

    expect(turn2Result.session.turns).toHaveLength(2);
    expect(turn2Result.turn.version).toBe(2);
    expect(turn2Result.turn.parentId).toBe(session.turns[0].id);
    expect(turn2Result.turn.parentVersion).toBe(1);

    // Branch again from v1 (session.turns[0].id)
    const turn3Result = await videoIterationService.iterateVideo({
      session: turn2Result.session,
      projectId: 'proj-1',
      artifactId: 'art-1',
      variantIndex: 0,
      parentTurnId: session.turns[0].id,
      instruction: 'Switch to slow-motion tracking shot',
      settings: { mode: 'extend', keepAudio: false, durationSeconds: 6 },
    });

    expect(turn3Result.session.turns).toHaveLength(3);
    expect(turn3Result.turn.version).toBe(3);
    expect(turn3Result.turn.parentId).toBe(session.turns[0].id);
    expect(turn3Result.turn.parentVersion).toBe(1);
    expect(turn3Result.turn.effectivePrompt).toContain('Extend this video.');
    expect(turn3Result.turn.effectivePrompt).toContain('Regenerate audio');
  });

  it('hydrates existing sessions from IndexedDB and refreshes blob URLs', async () => {
    const savedSession = videoIterationService.createInitialSession({
      projectId: 'proj-1',
      artifactId: 'art-hydrate',
      variantIndex: 0,
      baseAsset: { id: 'asset-orig', url: 'blob:stale-url' },
      initialPrompt: 'Initial prompt',
    });
    vi.mocked(get).mockResolvedValueOnce(savedSession);
    vi.mocked(mediaAssetService.getObjectUrl).mockResolvedValueOnce('blob:refreshed-url');

    const hydrated = await videoIterationService.getOrCreateSession({
      projectId: 'proj-1',
      artifactId: 'art-hydrate',
      variantIndex: 0,
      baseAsset: { id: 'asset-orig', url: 'blob:fallback-url' },
      initialPrompt: 'Initial prompt',
    });

    expect(hydrated.id).toBe(savedSession.id);
    expect(hydrated.turns[0].assetUrl).toBe('blob:refreshed-url');
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
