import type {
  BuildProductionPlanInput,
  ProductionRun,
  ProductionShot,
  VeoModelId,
} from '@core/types';
import { buildFlowVeoScenePack } from '@core/services/flowVeo/flowVeoPromptBuilder';
import {
  ElectronBridgeAdapter,
  getDesktopProviderBridge,
} from '@core/providers/electronBridgeAdapter';
import { ProviderRouter } from '@core/providers/providerRouter';
import {
  VEO_PRICING_EFFECTIVE_DATE,
  veoGenerationService,
} from '@core/services/veoGenerationService';
import { continuityService } from '@core/services/continuityService';

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
      input.promptState.veoModel === 'quality' ? 'veo-3.1-quality' : 'veo-3.1-fast';
    const resolution = ['720p', '1080p', '4k'].includes(input.promptState.resolution)
      ? (input.promptState.resolution as '720p' | '1080p' | '4k')
      : '720p';

    const bible =
      input.productionBible ?? continuityService.normalizeBible({}, createdAt).productionBible;
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

      const shot: ProductionShot = {
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
        continuityBinding: {
          profileIds: [
            sourceShot?.characterId ? `continuity-character-${sourceShot.characterId}` : '',
            sourceShot?.locationId ? `continuity-location-${sourceShot.locationId}` : '',
          ].filter(Boolean),
          explicitReferenceAssetIds: [],
          locks: {},
        },
      };
      const compiled = continuityService.compileShot({ shot, bible, assets: input.assets ?? [] });
      return {
        ...shot,
        generationRequest: compiled.request,
        continuitySnapshot: compiled.snapshot,
        continuityReport: compiled.report,
      };
    });
    const estimatedUsd = shots.reduce(
      (sum, shot) => sum + veoGenerationService.estimateCost(shot.generationRequest),
      0,
    );

    return {
      schemaVersion: 3,
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
    const bridge = getDesktopProviderBridge();
    if (!bridge) {
      throw new Error(
        'Audited plan enhancement requires the desktop provider bridge. The local plan remains unchanged.',
      );
    }
    const router = new ProviderRouter([new ElectronBridgeAdapter('gemini-api', bridge)]);
    const prompt = `Enhance this creator plan with cinematic details. Improve continuity, camera intent, motion pacing, and audio direction without changing the core concept. Keep it concise.\n\n${run.brief}`;
    const response = await router.execute(
      { operation: 'plan', mode: 'smart' },
      {
        operation: 'plan',
        prompt,
        costContext: {
          approvedCeilingUsd: run.approvals.find(
            (approval) => approval.kind === 'plan-enhancement' && approval.status === 'consumed',
          )?.maximumCostUsd,
          estimatedInputTokens: 4_000,
          estimatedOutputTokens: 4_000,
        },
      },
    );
    return response.text?.trim() || run.brief;
  }
}

export const directorPlanningService = DirectorPlanningService.getInstance();
