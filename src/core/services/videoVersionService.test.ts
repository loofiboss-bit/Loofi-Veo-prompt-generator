import { describe, expect, it, vi, beforeEach } from 'vitest';
import { videoVersionService } from './videoVersionService';
import type { VideoIterationSession } from '@core/types/videoIteration';

vi.mock('./videoIterationService', () => ({
  videoIterationService: {
    saveSession: vi.fn().mockResolvedValue(undefined),
  },
}));

const mockSetSbShots = vi.fn();
const mockSyncTimelineFromShots = vi.fn();

vi.mock('@core/store/useAppStore', () => ({
  useAppStore: {
    getState: vi.fn(() => ({
      sbShots: [
        {
          id: 1,
          action: 'Original scene',
          takes: [],
          selectedTakeIndex: 0,
        },
      ],
      setSbShots: mockSetSbShots,
      syncTimelineFromShots: mockSyncTimelineFromShots,
    })),
  },
}));

describe('videoVersionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockSession: VideoIterationSession = {
    id: 'session-1',
    projectId: 'p1',
    artifactId: 'a1',
    variantIndex: 0,
    rootAssetId: 'asset-1',
    activeTurnId: 'turn-2',
    updatedAt: 100,
    turns: [
      {
        id: 'turn-1',
        version: 1,
        parentId: null,
        instruction: 'Initial text',
        effectivePrompt: 'Initial video prompt',
        assetId: 'asset-1',
        assetUrl: 'blob:video-1',
        settings: {
          durationSeconds: 8,
          resolution: '720p',
          aspectRatio: '16:9',
          modelId: 'gemini-omni-1.1-flash',
        },
        costEstimateUsd: 0,
        createdAt: 1000,
      },
      {
        id: 'turn-2',
        version: 2,
        parentId: 'turn-1',
        instruction: 'Add rain and street reflections',
        effectivePrompt: 'Initial video prompt -> Add rain and street reflections',
        assetId: 'asset-2',
        assetUrl: 'blob:video-2',
        settings: {
          durationSeconds: 8,
          resolution: '720p',
          aspectRatio: '16:9',
          modelId: 'gemini-omni-1.1-flash',
        },
        costEstimateUsd: 0.8,
        createdAt: 2000,
      },
    ],
  };

  it('switches the active version safely without modifying media assets', async () => {
    const updated = await videoVersionService.switchActiveVersion(mockSession, 'turn-1');
    expect(updated.activeTurnId).toBe('turn-1');
  });

  it('throws an error when switching to a non-existent version', async () => {
    await expect(
      videoVersionService.switchActiveVersion(mockSession, 'non-existent'),
    ).rejects.toThrow(/not found in iteration history/);
  });

  it('prepares side-by-side comparison structures for VideoResultCompare', () => {
    const comparison = videoVersionService.prepareComparison(mockSession, 'turn-1', 'turn-2');
    expect(comparison).toHaveLength(2);
    expect(comparison[0].id).toBe('turn-1');
    expect(comparison[0].src).toBe('blob:video-1');
    expect(comparison[1].id).toBe('turn-2');
    expect(comparison[1].src).toBe('blob:video-2');
    expect(comparison[1].prompt).toContain('Add rain and street reflections');
  });

  it('safely applies a chosen version to a Storyboard scene with non-destructive takes', () => {
    const turn = mockSession.turns[1];
    const success = videoVersionService.applyVersionToStoryboardShot(1, turn);

    expect(success).toBe(true);
    expect(mockSetSbShots).toHaveBeenCalledOnce();
    expect(mockSyncTimelineFromShots).toHaveBeenCalledOnce();

    const updatedShots = mockSetSbShots.mock.calls[0][0];
    expect(updatedShots[0].takes).toHaveLength(1);
    expect(updatedShots[0].takes[0]).toBe('blob:video-2');
    expect(updatedShots[0].videoUrl).toBe('blob:video-2');
    expect(updatedShots[0].action).toBe(turn.instruction);
  });
});
