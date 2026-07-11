import type { Asset, ProductionRun, ProductionShot } from '@core/types';
import { veoGenerationService } from './veoGenerationService';

export type PreflightCategory =
  | 'prompt-clarity'
  | 'continuity'
  | 'camera'
  | 'motion'
  | 'audio'
  | 'safety'
  | 'capability'
  | 'cost'
  | 'asset-readiness';

export interface ContinuityLocks {
  character?: string;
  wardrobe?: string;
  location?: string;
  lighting?: string;
  lensLanguage?: string;
  cameraDirection?: string;
  audioBed?: string;
}

export interface PreflightPatch {
  target: 'shot-request';
  shotId: number;
  field: keyof Pick<
    ProductionShot['generationRequest'],
    'prompt' | 'negativePrompt' | 'resolution' | 'modelId'
  >;
  value: string;
  previousValue?: string;
}

export interface PreflightRecommendation {
  id: string;
  category: PreflightCategory;
  severity: 'info' | 'warning' | 'blocking';
  reason: string;
  suggestion: string;
  patch?: PreflightPatch;
}

export interface PreflightCategoryResult {
  category: PreflightCategory;
  status: 'ready' | 'attention' | 'blocked';
  reasons: string[];
}

export interface ProductionPreflightResult {
  runId: string;
  reproducibilityKey: string;
  categories: PreflightCategoryResult[];
  recommendations: PreflightRecommendation[];
  canApprove: boolean;
  generatedAt: number;
}

const includesMotion = (text: string) =>
  /\b(move|moving|walk|run|turn|pan|tilt|dolly|track|orbit|push|pull|zoom)\b/i.test(text);
const includesAudio = (text: string) =>
  /\b(audio|sound|music|dialogue|voice|ambience|silence|sfx)\b/i.test(text);

const stableHash = (value: string): string => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};

class ProductionPreflightService {
  analyze(input: {
    run: ProductionRun;
    assets: Asset[];
    locks?: ContinuityLocks;
  }): ProductionPreflightResult {
    const { run, assets, locks = {} } = input;
    const reasons = new Map<PreflightCategory, string[]>();
    const recommendations: PreflightRecommendation[] = [];
    const add = (category: PreflightCategory, reason: string) => {
      reasons.set(category, [...(reasons.get(category) ?? []), reason]);
    };

    for (const shot of run.shots) {
      const request = shot.generationRequest;
      if (request.prompt.trim().length < 24) {
        add('prompt-clarity', `Shot ${shot.id} prompt is too short to express subject and action.`);
      }
      if (!shot.camera.trim()) add('camera', `Shot ${shot.id} has no camera intent.`);
      if (!includesMotion(`${request.prompt} ${shot.camera}`))
        add('motion', `Shot ${shot.id} has no explicit motion direction.`);
      if (!includesAudio(request.prompt)) add('audio', `Shot ${shot.id} has no audio direction.`);
      if (!request.negativePrompt?.trim())
        add('safety', `Shot ${shot.id} has no negative constraints.`);

      for (const issue of veoGenerationService.validateRequest(request)) {
        add('capability', `Shot ${shot.id}: ${issue.message}`);
      }

      const requiredAssetIds = [
        request.firstFrameAssetId,
        request.lastFrameAssetId,
        ...request.referenceAssetIds,
      ].filter((id): id is string => Boolean(id));
      for (const assetId of requiredAssetIds) {
        if (!assets.some((asset) => asset.id === assetId)) {
          add('asset-readiness', `Shot ${shot.id} references missing asset ${assetId}.`);
        }
      }

      const shotText = `${request.prompt} ${shot.camera}`.toLowerCase();
      for (const [lockName, lockValue] of Object.entries(locks)) {
        if (lockValue?.trim() && !shotText.includes(lockValue.trim().toLowerCase())) {
          add('continuity', `Shot ${shot.id} does not mention locked ${lockName}: ${lockValue}.`);
        }
      }

      if (request.modelId === 'veo-3.1-quality' && request.resolution === '720p') {
        recommendations.push({
          id: `budget-${shot.id}`,
          category: 'cost',
          severity: 'info',
          reason: 'This unconstrained 720p draft can use a lower-cost model.',
          suggestion: 'Preview a switch to Veo 3.1 Fast; approval is still required.',
          patch: {
            target: 'shot-request',
            shotId: shot.id,
            field: 'modelId',
            value: 'veo-3.1-fast',
            previousValue: request.modelId,
          },
        });
      }
    }

    const currentEstimate = run.shots.reduce(
      (total, shot) => total + veoGenerationService.estimateCost(shot.generationRequest),
      0,
    );
    if (run.cost.approvedUsd > 0 && currentEstimate > run.cost.approvedUsd) {
      add(
        'cost',
        `Current estimate $${currentEstimate.toFixed(2)} exceeds approval $${run.cost.approvedUsd.toFixed(2)}.`,
      );
    }

    const categories: PreflightCategory[] = [
      'prompt-clarity',
      'continuity',
      'camera',
      'motion',
      'audio',
      'safety',
      'capability',
      'cost',
      'asset-readiness',
    ];
    const blocking = new Set<PreflightCategory>(['capability', 'cost', 'asset-readiness']);
    const categoryResults = categories.map(
      (category): PreflightCategoryResult => ({
        category,
        status: reasons.has(category)
          ? blocking.has(category)
            ? 'blocked'
            : 'attention'
          : 'ready',
        reasons: reasons.get(category) ?? [],
      }),
    );
    const snapshot = JSON.stringify({
      shots: run.shots.map((shot) => shot.generationRequest),
      assets: assets.map((asset) => asset.id).sort(),
      locks,
      approvedUsd: run.cost.approvedUsd,
    });
    return {
      runId: run.id,
      reproducibilityKey: stableHash(snapshot),
      categories: categoryResults,
      recommendations,
      canApprove: !categoryResults.some((result) => result.status === 'blocked'),
      generatedAt: Date.now(),
    };
  }

  applyPatch(run: ProductionRun, patch: PreflightPatch): ProductionRun {
    return {
      ...run,
      shots: run.shots.map((shot) =>
        shot.id === patch.shotId
          ? {
              ...shot,
              generationRequest: { ...shot.generationRequest, [patch.field]: patch.value },
            }
          : shot,
      ),
      updatedAt: Date.now(),
    };
  }

  undoPatch(run: ProductionRun, patch: PreflightPatch): ProductionRun {
    if (patch.previousValue === undefined) return run;
    return this.applyPatch(run, { ...patch, value: patch.previousValue });
  }
}

export const productionPreflightService = new ProductionPreflightService();
