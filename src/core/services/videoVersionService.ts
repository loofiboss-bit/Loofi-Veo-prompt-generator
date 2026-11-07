import type { VideoIterationSession, VideoIterationTurn } from '@core/types/videoIteration';
import type { VideoComparisonResult } from '@shared/components/VideoResultCompare';
import { videoIterationService } from './videoIterationService';
import { useAppStore } from '@core/store/useAppStore';
import { logger } from './loggerService';

export class VideoVersionService {
  private static instance: VideoVersionService;

  static getInstance(): VideoVersionService {
    if (!VideoVersionService.instance) {
      VideoVersionService.instance = new VideoVersionService();
    }
    return VideoVersionService.instance;
  }

  /**
   * Switches the active turn in a session without modifying any media assets or timeline cuts.
   */
  async switchActiveVersion(
    session: VideoIterationSession,
    targetTurnId: string,
  ): Promise<VideoIterationSession> {
    const target = session.turns.find((t) => t.id === targetTurnId);
    if (!target) {
      throw new Error(`Target version ${targetTurnId} not found in iteration history.`);
    }

    const updated: VideoIterationSession = {
      ...session,
      activeTurnId: target.id,
      updatedAt: Date.now(),
    };

    await videoIterationService.saveSession(updated);
    return updated;
  }

  /**
   * Builds side-by-side comparison structures for VideoResultCompare.
   */
  prepareComparison(
    session: VideoIterationSession,
    turnAId?: string,
    turnBId?: string,
  ): VideoComparisonResult[] {
    const turns = session.turns;
    if (turns.length === 0) return [];

    const defaultTurnB =
      turns.find((t) => t.id === session.activeTurnId) ??
      (turns.length > 1 ? turns[turns.length - 1] : turns[0]);
    const turnB = turns.find((t) => t.id === turnBId) ?? defaultTurnB;

    const defaultTurnA =
      (turnB.parentId ? turns.find((t) => t.id === turnB.parentId) : undefined) ?? turns[0];
    const turnA = turns.find((t) => t.id === turnAId) ?? defaultTurnA;

    const formatResult = (turn: VideoIterationTurn): VideoComparisonResult => ({
      id: turn.id,
      label: `Version ${turn.version}${turn.parentVersion ? ` (← v${turn.parentVersion})` : ''}: ${turn.instruction.slice(0, 30)}${turn.instruction.length > 30 ? '...' : ''}`,
      src: turn.assetUrl ?? '',
      prompt: turn.effectivePrompt,
      negativePrompt: '',
      settings: [
        `Mode: ${turn.settings.mode === 'extend' ? 'Extend (+seconds)' : 'Iterative Edit'}`,
        `Resolution: ${turn.settings.resolution}`,
        `Duration: ${turn.settings.durationSeconds}s`,
        `Aspect ratio: ${turn.settings.aspectRatio}`,
        `Audio: ${turn.settings.keepAudio === false ? 'Regenerated' : 'Preserved'}`,
        `Model: ${turn.settings.modelId}`,
        `Cost: $${turn.costEstimateUsd.toFixed(2)} USD`,
      ].join('\n'),
      comparisonNotes: `Created ${new Date(turn.createdAt).toLocaleTimeString()}`,
    });

    if (turnA.id === turnB.id) {
      return [formatResult(turnA)];
    }
    return [formatResult(turnA), formatResult(turnB)];
  }

  /**
   * Safely transfers a chosen version to a Storyboard scene with explicit confirmation.
   * Supports creating a new Storyboard scene when `shotId <= 0` or `sbShots` is empty,
   * registers the iteration video in the global Asset catalog, and syncs the Timeline.
   */
  applyVersionToStoryboardShot(shotId: number, turn: VideoIterationTurn): boolean {
    const appStore = useAppStore.getState();
    const shots = appStore.sbShots ?? [];
    const newTakeUrl = turn.assetUrl ?? '';

    const registerIterationAsset = () => {
      if (typeof appStore.addAsset === 'function' && turn.assetId) {
        appStore.addAsset({
          id: turn.assetId,
          type: 'video',
          name: `Iteration v${turn.version}: ${turn.instruction.slice(0, 32)}`,
          url: newTakeUrl,
          data: '',
          mimeType: 'video/mp4',
          version: turn.version,
          parentId: turn.parentId ?? undefined,
          storageKey: turn.assetId,
          durationSeconds: turn.settings.durationSeconds,
          tags: ['iteration', `v${turn.version}`],
        });
      }
    };

    if (shotId <= 0 || shots.length === 0) {
      const nextShotId = shots.length > 0 ? Math.max(...shots.map((s) => s.id)) + 1 : 1;
      const newShot = {
        id: nextShotId,
        type: 'video' as const,
        action: turn.instruction || `Iteration v${turn.version}`,
        camera: 'Static',
        characterId: '',
        takes: newTakeUrl ? [newTakeUrl] : [],
        selectedTakeIndex: 0,
        visualLink: false,
        duration: turn.settings.durationSeconds || 8,
        transition: { type: 'cut' as const, duration: 0 },
        videoUrl: newTakeUrl,
        generatedVideoUrl: newTakeUrl,
      };

      registerIterationAsset();
      appStore.setSbShots([...shots, newShot]);
      appStore.syncTimelineFromShots();
      appStore.updateTimelineClip?.(`video_${nextShotId}`, {
        label: `Shot ${nextShotId} (v${turn.version})`,
        duration: turn.settings.durationSeconds || 8,
      });
      logger.info(`Created new storyboard shot ${nextShotId} from version ${turn.version}`);
      return true;
    }

    const targetShot = shots.find((s) => s.id === shotId);
    if (!targetShot) {
      logger.warn(`Storyboard shot ${shotId} not found`);
      return false;
    }

    const updatedTakes = [...(targetShot.takes ?? []), newTakeUrl].filter(Boolean);

    const updatedShots = shots.map((s) =>
      s.id === shotId
        ? {
            ...s,
            videoUrl: newTakeUrl || s.videoUrl,
            generatedVideoUrl: newTakeUrl || s.generatedVideoUrl,
            takes: updatedTakes,
            selectedTakeIndex: Math.max(0, updatedTakes.length - 1),
            duration: turn.settings.durationSeconds || s.duration,
            action: turn.instruction || s.action,
          }
        : s,
    );

    registerIterationAsset();
    appStore.setSbShots(updatedShots);
    appStore.syncTimelineFromShots();
    appStore.updateTimelineClip?.(`video_${shotId}`, {
      label: `Shot ${shotId} (v${turn.version})`,
      duration: turn.settings.durationSeconds || targetShot.duration,
    });
    logger.info(`Transferred version ${turn.version} to storyboard shot ${shotId}`);
    return true;
  }
}

export const videoVersionService = VideoVersionService.getInstance();
