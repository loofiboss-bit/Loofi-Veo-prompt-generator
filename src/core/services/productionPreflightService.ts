import type { Asset, ContinuityOverrideRecord, ProductionRun, ProductionShot } from '@core/types';
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
  continuity: {
    blockers: string[];
    warnings: string[];
    unresolvedWarnings: string[];
    overrideRecords: ContinuityOverrideRecord[];
    reportCount: number;
  };
  canApprove: boolean;
  generatedAt: number;
}

export interface RecommendationImpact {
  runId: string;
  recommendationId: string;
  shotId: number;
  appliedAt: number;
  baselineTakeId?: string;
  baselineScore?: number;
  acceptedTakeId?: string;
  acceptedScore?: number;
  scoreDelta?: number;
  improved?: boolean;
}

const IMPACT_STORAGE_KEY = 'v8-production-recommendation-impact';

const readImpacts = (): RecommendationImpact[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(IMPACT_STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeImpacts = (impacts: RecommendationImpact[]) => {
  localStorage.setItem(IMPACT_STORAGE_KEY, JSON.stringify(impacts.slice(-200)));
};

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
  createContinuityOverride(
    run: ProductionRun,
    shotId: number,
    reason: string,
  ): ContinuityOverrideRecord {
    const shot = run.shots.find((candidate) => candidate.id === shotId);
    if (!shot?.continuitySnapshot || !shot.continuityReport) {
      throw new Error(
        'A compiled continuity snapshot is required before a warning can be overridden.',
      );
    }
    const warningCodes = shot.continuityReport.issues
      .filter((item) => item.severity === 'warning')
      .map((item) => item.code);
    if (warningCodes.length === 0) {
      throw new Error('This shot has no soft continuity warning to override.');
    }
    const trimmedReason = reason.trim();
    if (!trimmedReason) throw new Error('A continuity override reason is required.');
    return {
      id: crypto.randomUUID(),
      shotId,
      snapshotHash: shot.continuitySnapshot.snapshotHash,
      issueCodes: warningCodes,
      reason: trimmedReason,
      createdAt: Date.now(),
    };
  }

  trackAppliedRecommendation(
    run: ProductionRun,
    recommendation: PreflightRecommendation,
  ): RecommendationImpact | null {
    const shotId = recommendation.patch?.shotId;
    const shot = run.shots.find((candidate) => candidate.id === shotId);
    if (!shot || shotId === undefined) return null;
    const baseline = [...shot.takes].reverse().find((take) => take.review);
    const impact: RecommendationImpact = {
      runId: run.id,
      recommendationId: recommendation.id,
      shotId,
      appliedAt: Date.now(),
      baselineTakeId: baseline?.id,
      baselineScore: baseline?.review?.overallScore,
    };
    const impacts = readImpacts().filter(
      (item) => !(item.runId === run.id && item.recommendationId === recommendation.id),
    );
    writeImpacts([...impacts, impact]);
    return impact;
  }

  discardTrackedRecommendation(runId: string, recommendationId: string): void {
    writeImpacts(
      readImpacts().filter(
        (impact) => !(impact.runId === runId && impact.recommendationId === recommendationId),
      ),
    );
  }

  recordAcceptedTakeImpact(
    runId: string,
    shotId: number,
    takeId: string,
    acceptedScore?: number,
  ): RecommendationImpact[] {
    const completed = readImpacts().map((impact) => {
      if (impact.runId !== runId || impact.shotId !== shotId || impact.acceptedTakeId)
        return impact;
      const scoreDelta =
        impact.baselineScore === undefined || acceptedScore === undefined
          ? undefined
          : acceptedScore - impact.baselineScore;
      return {
        ...impact,
        acceptedTakeId: takeId,
        acceptedScore,
        scoreDelta,
        improved: scoreDelta === undefined ? undefined : scoreDelta > 0,
      };
    });
    writeImpacts(completed);
    return completed.filter(
      (impact) =>
        impact.runId === runId && impact.shotId === shotId && impact.acceptedTakeId === takeId,
    );
  }

  getRecommendationImpacts(runId: string): RecommendationImpact[] {
    return readImpacts().filter((impact) => impact.runId === runId);
  }

  analyze(input: {
    run: ProductionRun;
    assets: Asset[];
    locks?: ContinuityLocks;
    continuityOverrides?: ContinuityOverrideRecord[];
  }): ProductionPreflightResult {
    const { run, assets, locks = {}, continuityOverrides } = input;
    const effectiveContinuityOverrides = [
      ...(run.continuityOverrides ?? []),
      ...(continuityOverrides ?? []),
    ].filter(
      (record, index, records) =>
        records.findIndex(
          (candidate) =>
            candidate.shotId === record.shotId && candidate.snapshotHash === record.snapshotHash,
        ) === index,
    );
    const reasons = new Map<PreflightCategory, string[]>();
    const recommendations: PreflightRecommendation[] = [];
    const add = (category: PreflightCategory, reason: string) => {
      reasons.set(category, [...(reasons.get(category) ?? []), reason]);
    };
    const continuityBlockers: string[] = [];
    const continuityWarnings: string[] = [];
    const continuityWarningIssues: Array<{
      shotId: number;
      snapshotHash?: string;
      code: ContinuityOverrideRecord['issueCodes'][number];
      message: string;
    }> = [];
    let continuityReportCount = 0;

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

      if (shot.continuityReport) {
        continuityReportCount += 1;
        shot.continuityReport.issues.forEach((continuityIssue) => {
          if (continuityIssue.severity === 'blocking') {
            continuityBlockers.push(`Shot ${shot.id}: ${continuityIssue.message}`);
            add('continuity', `Shot ${shot.id}: ${continuityIssue.message}`);
          } else if (continuityIssue.severity === 'warning') {
            continuityWarnings.push(`Shot ${shot.id}: ${continuityIssue.message}`);
            add('continuity', `Shot ${shot.id}: ${continuityIssue.message}`);
            continuityWarningIssues.push({
              shotId: shot.id,
              snapshotHash: shot.continuitySnapshot?.snapshotHash,
              code: continuityIssue.code,
              message: `Shot ${shot.id}: ${continuityIssue.message}`,
            });
          }
        });
      }

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
          const warning = `Shot ${shot.id} does not mention locked ${lockName}: ${lockValue}.`;
          continuityWarnings.push(warning);
          add('continuity', warning);
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
    const blocking = new Set<PreflightCategory>([
      'capability',
      'cost',
      'asset-readiness',
      'continuity',
    ]);
    const categoryResults = categories.map(
      (category): PreflightCategoryResult => ({
        category,
        status:
          category === 'continuity'
            ? continuityBlockers.length > 0
              ? 'blocked'
              : continuityWarnings.length > 0
                ? 'attention'
                : 'ready'
            : reasons.has(category)
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
    const currentOverrides = effectiveContinuityOverrides.filter((record) =>
      run.shots.some(
        (shot) =>
          shot.id === record.shotId &&
          shot.continuitySnapshot?.snapshotHash === record.snapshotHash,
      ),
    );
    const unresolvedWarnings = continuityWarningIssues
      .filter(
        (warning) =>
          !currentOverrides.some(
            (record) =>
              record.shotId === warning.shotId &&
              record.snapshotHash === warning.snapshotHash &&
              record.issueCodes.includes(warning.code),
          ),
      )
      .map((warning) => warning.message);
    return {
      runId: run.id,
      reproducibilityKey: stableHash(snapshot),
      categories: categoryResults,
      recommendations,
      continuity: {
        blockers: continuityBlockers,
        warnings: continuityWarnings,
        unresolvedWarnings,
        overrideRecords: currentOverrides,
        reportCount: continuityReportCount,
      },
      canApprove:
        !categoryResults.some((result) => result.status === 'blocked') &&
        unresolvedWarnings.length === 0,
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
