import { describe, expect, it, vi, beforeEach } from 'vitest';
import { videoVersionService } from './videoVersionService';
import { productionRunService } from './productionRunService';
import type { VideoIterationSession } from '@core/types/videoIteration';

vi.mock('./videoIterationService', () => ({
  videoIterationService: {
    saveSession: vi.fn().mockResolvedValue(undefined),
  },
}));

const mockSetSbShots = vi.fn();
const mockSyncTimelineFromShots = vi.fn();
const mockAddAsset = vi.fn();
const mockUpdateTimelineClip = vi.fn();
let mockClips: Array<{
  id: string;
  resourceId: number | string;
  startTime: number;
  duration: number;
  offset: number;
  volume?: number;
  label?: string;
  selectedTakeId?: string;
}> = [];

vi.mock('@core/store/useAppStore', () => ({
  useAppStore: {
    getState: vi.fn(() => ({
      sbShots: [
        {
          id: 1,
          action: 'Original scene',
          duration: 5,
          takes: [],
          selectedTakeIndex: 0,
        },
      ],
      clips: mockClips,
      setSbShots: mockSetSbShots,
      syncTimelineFromShots: mockSyncTimelineFromShots,
      addAsset: mockAddAsset,
      updateTimelineClip: mockUpdateTimelineClip,
    })),
  },
}));

describe('videoVersionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClips = [];
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
    expect(updatedShots[0].action).toBe('Original scene');
    expect(updatedShots[0].duration).toBe(5);
    expect(mockAddAsset).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'asset-2',
        version: 2,
        storageKey: 'asset-2',
      }),
    );
    expect(mockUpdateTimelineClip).toHaveBeenCalledWith(
      'video_1',
      expect.objectContaining({
        label: 'Shot 1 (v2)',
        selectedTakeId: 'turn-2',
      }),
    );
    expect(mockUpdateTimelineClip.mock.calls[0][1]).not.toHaveProperty('duration');
  });

  it('preserves existing trimmed timeline clip duration and edits without calling syncTimelineFromShots', () => {
    mockClips = [
      {
        id: 'video_1',
        resourceId: 1,
        startTime: 3,
        duration: 2.5,
        offset: 4,
        volume: 0.4,
        label: 'Shot 1',
      },
    ];
    const turn = mockSession.turns[1];
    const success = videoVersionService.applyVersionToStoryboardShot(1, turn);

    expect(success).toBe(true);
    expect(mockSyncTimelineFromShots).not.toHaveBeenCalled();
    expect(mockUpdateTimelineClip).toHaveBeenCalledWith('video_1', {
      label: 'Shot 1 (v2)',
      selectedTakeId: 'turn-2',
    });
  });

  it('preserves 12s Omni duration when bridging an iteration turn into a ProductionTake', async () => {
    const getRunSpy = vi.spyOn(productionRunService, 'getRun').mockResolvedValue({
      id: 'run-1',
      projectId: 'p1',
      sourceArtifactId: 'a1',
      sourceVariantIndex: 0,
      shots: [
        {
          id: 1,
          generationRequest: {
            mode: 'text-to-video',
            modelId: 'veo-3.1-fast',
            prompt: 'Original prompt',
            aspectRatio: '16:9',
            resolution: '720p',
            durationSeconds: 8,
            referenceAssetIds: [],
          },
          takes: [],
        },
      ],
    } as never);
    const appendSpy = vi
      .spyOn(productionRunService, 'appendTakeToShot')
      .mockResolvedValue({} as never);

    const take = await videoVersionService.applyVersionToProductionTake('run-1', 1, {
      ...mockSession.turns[1],
      settings: {
        ...mockSession.turns[1].settings,
        modelId: 'gemini-omni-1.2-flash',
        durationSeconds: 12,
      },
    });

    expect(take.request.durationSeconds).toBe(12);

    getRunSpy.mockRestore();
    appendSpy.mockRestore();
  });

  it('creates a new Storyboard scene automatically when shotId is -1 or sbShots is empty', () => {
    const turn = mockSession.turns[1];
    const success = videoVersionService.applyVersionToStoryboardShot(-1, turn);

    expect(success).toBe(true);
    expect(mockSetSbShots).toHaveBeenCalledOnce();
    const updatedShots = mockSetSbShots.mock.calls[0][0];
    expect(updatedShots).toHaveLength(2);
    expect(updatedShots[1].id).toBe(2);
    expect(updatedShots[1].videoUrl).toBe('blob:video-2');
    expect(mockUpdateTimelineClip).toHaveBeenCalledWith(
      'video_2',
      expect.objectContaining({
        label: 'Shot 2 (v2)',
      }),
    );
  });

  it('bridges an iteration turn directly into a ProductionRun shot as a ProductionTake', async () => {
    const getRunSpy = vi.spyOn(productionRunService, 'getRun').mockResolvedValue({
      id: 'run-1',
      projectId: 'p1',
      sourceArtifactId: 'a1',
      sourceVariantIndex: 0,
      shots: [
        {
          id: 1,
          generationRequest: {
            mode: 'text-to-video',
            modelId: 'veo-3.1-fast',
            prompt: 'Original prompt',
            aspectRatio: '16:9',
            resolution: '720p',
            durationSeconds: 8,
            referenceAssetIds: [],
          },
          takes: [],
        },
      ],
    } as never);
    const appendSpy = vi
      .spyOn(productionRunService, 'appendTakeToShot')
      .mockResolvedValue({} as never);

    const take = await videoVersionService.applyVersionToProductionTake('run-1', 1, {
      ...mockSession.turns[1],
      interactionId: 'int-omni-2',
    });

    expect(take.status).toBe('complete');
    expect(take.interactionId).toBe('int-omni-2');
    expect(take.localMediaKey).toBe('asset-2');
    expect(take.request.executionMode).toBe('gemini-omni');
    expect(appendSpy).toHaveBeenCalledWith('run-1', 1, expect.objectContaining({ id: take.id }));

    getRunSpy.mockRestore();
    appendSpy.mockRestore();
  });
});
