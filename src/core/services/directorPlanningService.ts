import type {
  BuildProductionPlanInput,
  ProductionRun,
  ProductionShot,
  VeoModelId,
} from '@core/types';
import { buildFlowVeoScenePack } from '@core/services/flowVeo/flowVeoPromptBuilder';
import { enhancePrompt } from '@core/services/gemini/geminiPromptService';
import {
  VEO_PRICING_EFFECTIVE_DATE,
  veoGenerationService,
} from '@core/services/veoGenerationService';

const supportedDuration = (duration: number): 4 | 6 | 8 => {
  if (duration <= 4) return 4;
  if (duration <= 6) return 6;
  return 8;
};

class DirectorPlanningService {
  private static instance: DirectorPlanningService;

  static getInstance(): DirectorPlanningService {
    if (!DirectorPlanningService.instance) {
      DirectorPlanningService.instance = new DirectorPlanningService();
    }
    return DirectorPlanningService.instance;
  }

  buildLocalPlan(input: BuildProductionPlanInput): ProductionRun {
    const scenePack = buildFlowVeoScenePack(input.promptState, {
      mode: 'flow-scene-pack',
      title: input.title,
      shots: input.shots,
    });
    const createdAt = Date.now();
    const modelId: VeoModelId =
      input.promptState.veoModel === 'quality'
        ? 'veo-3.1-generate-preview'
        : 'veo-3.1-fast-generate-preview';
    const resolution = ['720p', '1080p', '4k'].includes(input.promptState.resolution)
      ? (input.promptState.resolution as '720p' | '1080p' | '4k')
      : '720p';

    const shots: ProductionShot[] = scenePack.shotCards.map((card, index) => {
      const sourceShot = input.shots?.[index];
      const durationSeconds = resolution === '720p' ? supportedDuration(card.durationSeconds) : 8;
      const generationRequest = {
        mode: 'text-to-video' as const,
        modelId,
        prompt: card.prompt,
        negativePrompt: card.negativePrompt,
        aspectRatio:
          input.promptState.aspectRatio === '9:16' ? ('9:16' as const) : ('16:9' as const),
        resolution,
        durationSeconds,
        referenceAssetIds: [],
      };

      return {
        id: sourceShot?.id ?? index + 1,
        sourceShotId: sourceShot?.id,
        title: card.title,
        prompt: card.prompt,
        negativePrompt: card.negativePrompt,
        camera: card.camera,
        durationSeconds: card.durationSeconds,
        status: 'awaiting-approval',
        generationRequest,
        takes: [],
      };
    });
    const estimatedUsd = shots.reduce(
      (sum, shot) => sum + veoGenerationService.estimateCost(shot.generationRequest),
      0,
    );

    return {
      schemaVersion: 1,
      id: crypto.randomUUID(),
      projectId: input.projectId,
      title: input.title || scenePack.title,
      status: 'awaiting-approval',
      brief: input.promptState.idea || scenePack.oneShotPrompt,
      source: 'local',
      planRevision: 1,
      promptSnapshot: input.promptState,
      assetIds: (input.assets ?? []).map((asset) => asset.id),
      shots,
      approvals: [],
      cost: {
        estimatedUsd,
        approvedUsd: 0,
        recordedUsd: 0,
        pricingEffectiveDate: VEO_PRICING_EFFECTIVE_DATE,
      },
      createdAt,
      updatedAt: createdAt,
    };
  }

  async enhancePlanBrief(run: ProductionRun): Promise<string> {
    return enhancePrompt(
      run.brief,
      `Director plan with ${run.shots.length} shots. Improve continuity, camera intent, motion pacing, and audio direction without changing the core concept`,
    );
  }
}

export const directorPlanningService = DirectorPlanningService.getInstance();
