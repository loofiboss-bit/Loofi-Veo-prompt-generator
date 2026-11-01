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

    const turnA = turns.find((t) => t.id === turnAId) ?? turns[0];
    const turnB =
      turns.find((t) => t.id === turnBId) ??
      (turns.length > 1 ? turns[turns.length - 1] : turns[0]);

    const formatResult = (turn: VideoIterationTurn): VideoComparisonResult => ({
      id: turn.id,
      label: `Version ${turn.version}: ${turn.instruction.slice(0, 30)}${turn.instruction.length > 30 ? '...' : ''}`,
      src: turn.assetUrl ?? '',
      prompt: turn.effectivePrompt,
      negativePrompt: '',
      settings: [
        `Resolution: ${turn.settings.resolution}`,
        `Duration: ${turn.settings.durationSeconds}s`,
        `Aspect ratio: ${turn.settings.aspectRatio}`,
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
   * Protects non-selected shots and preserves the original take history.
   */
  applyVersionToStoryboardShot(shotId: number, turn: VideoIterationTurn): boolean {
    const appStore = useAppStore.getState();
    const shots = appStore.sbShots ?? [];
    const targetShot = shots.find((s) => s.id === shotId);
    if (!targetShot) {
      logger.warn(`Storyboard shot ${shotId} not found`);
      return false;
    }

    const newTakeUrl = turn.assetUrl ?? '';
    const updatedTakes = [...(targetShot.takes ?? []), newTakeUrl].filter(Boolean);

    const updatedShots = shots.map((s) =>
      s.id === shotId
        ? {
            ...s,
            videoUrl: newTakeUrl || s.videoUrl,
            generatedVideoUrl: newTakeUrl || s.generatedVideoUrl,
            takes: updatedTakes,
            selectedTakeIndex: Math.max(0, updatedTakes.length - 1),
            action: turn.instruction || s.action,
          }
        : s,
    );

    appStore.setSbShots(updatedShots);
    appStore.syncTimelineFromShots();
    logger.info(`Transferred version ${turn.version} to storyboard shot ${shotId}`);
    return true;
  }
}

export const videoVersionService = VideoVersionService.getInstance();
