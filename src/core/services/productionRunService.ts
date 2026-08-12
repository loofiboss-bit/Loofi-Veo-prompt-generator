import { createStore, del, get, keys, set } from 'idb-keyval';

import { logger } from '@core/services/loggerService';
import {
  VEO_PRICING_EFFECTIVE_DATE,
  veoGenerationService,
} from '@core/services/veoGenerationService';
import { storeMediator } from '@core/store/mediator';
import { getModel } from '@core/models/catalog';
import { estimateMaximumModelCost, requireUsableCostEstimate } from '@core/models/cost';
import { continuityService, fingerprintAsset } from '@core/services/continuityService';
import { useAppStore } from '@core/store/useAppStore';
import type {
  ProductionApproval,
  ContinuityOverrideRecord,
  ProductionRun,
  ProductionRunStatus,
  ProductionShot,
  ProductionTake,
  ShotReviewResult,
} from '@core/types';

const RUN_STORE = createStore('veo-production-runs', 'production-runs-v1');
const RUN_PREFIX = 'production-run:';

const normalizeSegmentDuration = (duration: number): 4 | 6 | 8 => {
  if (duration <= 4) return 4;
  if (duration <= 6) return 6;
  return 8;
};

const needsNormalization = (run: ProductionRun): boolean =>
  run.schemaVersion !== 3 ||
  !Array.isArray(run.approvals) ||
  !run.cost ||
  run.shots.some((shot) =>
    shot.takes.some(
      (take) => take.status === 'submitting' && !take.providerArtifact?.operationName,
    ),
  );

const unresolvedContinuityWarnings = (
  shots: ProductionShot[],
  overrides: ContinuityOverrideRecord[] = [],
): string[] =>
  shots.flatMap((shot) =>
    (shot.continuityReport?.issues ?? [])
      .filter((item) => item.severity === 'warning')
      .filter(
        (item) =>
          !overrides.some(
            (override) =>
              override.shotId === shot.id &&
              override.snapshotHash === shot.continuitySnapshot?.snapshotHash &&
              override.issueCodes.includes(item.code),
          ),
      )
      .map((item) => `Shot ${shot.id}: ${item.message}`),
  );

const compileCurrentContinuity = (shot: ProductionShot) => {
  const state = useAppStore.getState() as {
    assets?: Parameters<typeof continuityService.compileShot>[0]['assets'];
    productionBible?: Parameters<typeof continuityService.compileShot>[0]['bible'];
  };
  if (!state.productionBible) return null;
  return continuityService.compileShot({
    shot,
    bible: state.productionBible,
    assets: state.assets ?? [],
  });
};

const assertCurrentContinuitySnapshot = (shot: ProductionShot): void => {
  if (!shot.continuitySnapshot) return;
  const current = compileCurrentContinuity(shot);
  if (!current) return;
  if (current.snapshot.snapshotHash !== shot.continuitySnapshot.snapshotHash) {
    throw new Error(
      'This shot is stale because the Production Bible or continuity references changed. Recompile and approve again.',
    );
  }
  if (current.report.issues.some((item) => item.severity === 'blocking')) {
    throw new Error(
      `Continuity preflight blocked approval. ${current.report.issues
        .filter((item) => item.severity === 'blocking')
        .map((item) => item.message)
        .join(' ')}`,
    );
  }
};

const RUN_TRANSITIONS: Record<ProductionRunStatus, ProductionRunStatus[]> = {
  draft: ['planning', 'cancelled'],
  planning: ['awaiting-approval', 'failed', 'cancelled'],
  'awaiting-approval': ['generating', 'paused', 'cancelled'],
  generating: ['reviewing', 'needs-revision', 'paused', 'complete', 'failed', 'cancelled'],
  reviewing: ['needs-revision', 'generating', 'complete', 'paused', 'failed', 'cancelled'],
  'needs-revision': ['awaiting-approval', 'generating', 'paused', 'complete', 'cancelled'],
  paused: ['awaiting-approval', 'generating', 'reviewing', 'needs-revision', 'cancelled'],
  complete: [],
  failed: ['awaiting-approval', 'paused', 'cancelled'],
  cancelled: [],
};

const normalizeRun = (run: ProductionRun): ProductionRun => {
  const recoveredShots = run.shots.map((shot) => {
    const hasAmbiguousTake = shot.takes.some(
      (take) => take.status === 'submitting' && !take.providerArtifact?.operationName,
    );
    const takes = shot.takes.map((take) => {
      const model = getModel(take.request.modelId);
      const resolution = take.request.resolution;
      return {
        ...take,
        provider: take.provider ?? ('gemini-api' as const),
        apiSurface: take.apiSurface ?? ('google-ai-v1beta' as const),
        modelLifecycleSnapshot:
          take.modelLifecycleSnapshot ??
          (model?.lifecycle === 'stable' || model?.lifecycle === 'deprecated'
            ? model.lifecycle
            : ('preview' as const)),
        priceDimension: take.priceDimension ?? {
          unit: 'video-second' as const,
          resolution,
          usdPerUnit: model ? veoGenerationService.getUnitPrice(take.request) : 0,
        },
        ...(take.status === 'submitting' && !take.providerArtifact?.operationName
          ? { status: 'recovery-required' as const }
          : {}),
      };
    });
    if (!hasAmbiguousTake) return { ...shot, takes };
    return {
      ...shot,
      status: 'recovery-required' as const,
      takes,
    };
  });
  const requiresRecovery = recoveredShots.some((shot) => shot.status === 'recovery-required');

  return {
    ...run,
    schemaVersion: 3,
    status: requiresRecovery ? 'paused' : run.status,
    shots: recoveredShots,
    approvals: run.approvals ?? [],
    cost: {
      estimatedUsd: run.cost?.estimatedUsd ?? 0,
      approvedUsd: run.cost?.approvedUsd ?? 0,
      recordedUsd: run.cost?.recordedUsd ?? 0,
      pricingEffectiveDate: run.cost?.pricingEffectiveDate ?? 'unknown',
    },
  };
};

class ProductionRunService {
  private static instance: ProductionRunService;

  static getInstance(): ProductionRunService {
    if (!ProductionRunService.instance) {
      ProductionRunService.instance = new ProductionRunService();
    }
    return ProductionRunService.instance;
  }

  async createRun(run: ProductionRun): Promise<ProductionRun> {
    const normalized = normalizeRun(run);
    await set(`${RUN_PREFIX}${normalized.id}`, normalized, RUN_STORE);
    storeMediator.emit('production:runUpdated', {
      runId: normalized.id,
      projectId: normalized.projectId,
      status: normalized.status,
    });
    return normalized;
  }

  async getRun(runId: string): Promise<ProductionRun | null> {
    const run = await get<ProductionRun>(`${RUN_PREFIX}${runId}`, RUN_STORE);
    if (!run) {
      return null;
    }
    const normalized = normalizeRun(run);
    if (needsNormalization(run)) {
      await set(`${RUN_PREFIX}${runId}`, normalized, RUN_STORE);
    }
    return normalized;
  }

  async getRunsForProject(projectId: string): Promise<ProductionRun[]> {
    const runKeys = (await keys(RUN_STORE)).filter((key) => String(key).startsWith(RUN_PREFIX));
    const runs = await Promise.all(runKeys.map((key) => get<ProductionRun>(key, RUN_STORE)));
    return runs
      .filter((run): run is ProductionRun => Boolean(run && run.projectId === projectId))
      .map(normalizeRun)
      .sort((left, right) => right.updatedAt - left.updatedAt);
  }

  async saveRun(run: ProductionRun): Promise<ProductionRun> {
    const next = { ...normalizeRun(run), updatedAt: Date.now() };
    await set(`${RUN_PREFIX}${next.id}`, next, RUN_STORE);
    storeMediator.emit('production:runUpdated', {
      runId: next.id,
      projectId: next.projectId,
      status: next.status,
    });
    return next;
  }

  async deleteRun(runId: string): Promise<void> {
    const run = await this.getRun(runId);
    await del(`${RUN_PREFIX}${runId}`, RUN_STORE);
    if (run) {
      storeMediator.emit('production:runDeleted', { runId, projectId: run.projectId });
    }
  }

  async transition(runId: string, status: ProductionRunStatus): Promise<ProductionRun> {
    return this.mutateRun(runId, (run) => {
      if (run.status === status) {
        return run;
      }
      if (!RUN_TRANSITIONS[run.status].includes(status)) {
        throw new Error(`Invalid production transition: ${run.status} -> ${status}`);
      }
      return {
        ...run,
        status,
        completedAt: status === 'complete' ? Date.now() : run.completedAt,
      };
    });
  }

  async approveShots(
    runId: string,
    shotIds: number[],
    maximumCostUsd: number,
  ): Promise<ProductionApproval> {
    if (shotIds.length === 0) {
      throw new Error('Select at least one shot to approve.');
    }
    const run = await this.getRun(runId);
    if (!run) throw new Error(`Production run ${runId} was not found.`);
    const selectedShots = run.shots.filter((shot) => shotIds.includes(shot.id));
    if (selectedShots.length !== new Set(shotIds).size) {
      throw new Error('One or more selected shots were not found.');
    }
    selectedShots.forEach(assertCurrentContinuitySnapshot);
    const continuityBlockers = selectedShots.flatMap((shot) =>
      shot.continuityReport?.status === 'blocked'
        ? shot.continuityReport.issues
            .filter((item) => item.severity === 'blocking')
            .map((item) => `Shot ${shot.id}: ${item.message}`)
        : [],
    );
    if (continuityBlockers.length > 0) {
      throw new Error(`Continuity preflight blocked approval. ${continuityBlockers.join(' ')}`);
    }
    const continuityWarnings = unresolvedContinuityWarnings(selectedShots, run.continuityOverrides);
    if (continuityWarnings.length > 0) {
      throw new Error(
        `Continuity warning requires a documented override before approval. ${continuityWarnings.join(' ')}`,
      );
    }
    const capabilityBlockers = selectedShots.flatMap((shot) =>
      veoGenerationService
        .validateRequest(shot.generationRequest)
        .map((issue) => `Shot ${shot.id}: ${issue.message}`),
    );
    if (capabilityBlockers.length > 0) {
      throw new Error(
        `Model capability preflight blocked approval. ${capabilityBlockers.join(' ')}`,
      );
    }
    const shotCosts = selectedShots.map((shot) =>
      veoGenerationService.estimateCost(shot.generationRequest),
    );
    if (shotCosts.some((cost) => !Number.isFinite(cost) || cost <= 0)) {
      throw new Error(
        'Paid generation is blocked because one or more selected shots have no usable price.',
      );
    }
    const calculatedMaximum = shotCosts.reduce((total, cost) => total + cost, 0);
    if (!Number.isFinite(maximumCostUsd) || maximumCostUsd <= 0) {
      throw new Error('A positive maximum charge is required before approval.');
    }
    if (maximumCostUsd + Number.EPSILON < calculatedMaximum) {
      throw new Error('The requested approval ceiling is below the current conservative estimate.');
    }
    const approval: ProductionApproval = {
      id: crypto.randomUUID(),
      kind: 'generation-batch',
      shotIds: [...new Set(shotIds)],
      maximumCostUsd,
      confidence: 'exact',
      sourceUrl: 'https://ai.google.dev/gemini-api/docs/pricing',
      verifiedDate: VEO_PRICING_EFFECTIVE_DATE,
      submissionAllowance: shotIds.length,
      reviewAllowance: shotIds.length,
      consumedSubmissions: 0,
      consumedReviews: 0,
      status: 'active',
      createdAt: Date.now(),
      continuitySnapshotHashes: Object.fromEntries(
        selectedShots
          .filter((shot) => shot.continuitySnapshot?.snapshotHash)
          .map((shot) => [shot.id, shot.continuitySnapshot!.snapshotHash]),
      ),
    };

    await this.mutateRun(runId, (run) => ({
      ...run,
      approvals: [...run.approvals, approval],
      cost: {
        ...run.cost,
        approvedUsd: run.cost.approvedUsd + maximumCostUsd,
      },
      shots: run.shots.map((shot) =>
        approval.shotIds.includes(shot.id) && shot.status === 'awaiting-approval'
          ? { ...shot, status: 'approved' }
          : shot,
      ),
    }));
    return approval;
  }

  async approvePlanEnhancement(runId: string, maximumCostUsd: number): Promise<ProductionApproval> {
    const estimate = this.estimatePlanEnhancementCost();
    const calculatedMaximum = requireUsableCostEstimate(estimate);
    if (!Number.isFinite(maximumCostUsd) || maximumCostUsd < calculatedMaximum) {
      throw new Error('The plan-enhancement approval is below the conservative maximum charge.');
    }
    const approval: ProductionApproval = {
      id: crypto.randomUUID(),
      kind: 'plan-enhancement',
      shotIds: [],
      maximumCostUsd,
      confidence: estimate.confidence === 'exact' ? 'exact' : 'upper-bound',
      sourceUrl: estimate.source.sourceUrl,
      verifiedDate: estimate.source.verifiedDate,
      submissionAllowance: 1,
      reviewAllowance: 0,
      consumedSubmissions: 0,
      consumedReviews: 0,
      status: 'active',
      createdAt: Date.now(),
    };
    await this.mutateRun(runId, (run) => ({
      ...run,
      approvals: [...run.approvals, approval],
    }));
    return approval;
  }

  estimateContinuityReviewCost(shotCount = 1) {
    const model = getModel('gemini-3.6-flash');
    if (!model) throw new Error('Gemini continuity review pricing is unavailable.');
    const count = Math.max(1, Math.ceil(shotCount));
    return estimateMaximumModelCost(model, {
      estimatedInputTokensByModality: {
        video: 32_000 * count,
        // Up to three Veo identity references can be compared for each shot.
        // Reserve a conservative image-token ceiling so the explicit review
        // approval covers the multimodal payload as well as the clip.
        image: 12_000 * count,
        text: 2_000 * count,
      },
      estimatedOutputTokensByModality: { text: 2_000 * count },
    });
  }

  async approveContinuityReview(
    runId: string,
    shotIds: number[],
    maximumCostUsd: number,
  ): Promise<ProductionApproval> {
    const run = await this.getRun(runId);
    if (!run) throw new Error(`Production run ${runId} was not found.`);
    const uniqueShotIds = [...new Set(shotIds)];
    if (uniqueShotIds.length === 0) throw new Error('Select at least one shot to review.');
    if (uniqueShotIds.some((shotId) => !run.shots.some((shot) => shot.id === shotId))) {
      throw new Error('One or more selected shots were not found.');
    }
    const estimate = this.estimateContinuityReviewCost(uniqueShotIds.length);
    const calculatedMaximum = requireUsableCostEstimate(estimate);
    if (!Number.isFinite(maximumCostUsd) || maximumCostUsd < calculatedMaximum) {
      throw new Error('The continuity review approval is below the conservative maximum charge.');
    }
    const approval: ProductionApproval = {
      id: crypto.randomUUID(),
      kind: 'continuity-review',
      shotIds: uniqueShotIds,
      maximumCostUsd,
      confidence: estimate.confidence === 'exact' ? 'exact' : 'upper-bound',
      sourceUrl: estimate.source.sourceUrl,
      verifiedDate: estimate.source.verifiedDate,
      submissionAllowance: 0,
      reviewAllowance: uniqueShotIds.length,
      consumedSubmissions: 0,
      consumedReviews: 0,
      status: 'active',
      createdAt: Date.now(),
      continuitySnapshotHashes: Object.fromEntries(
        run.shots
          .filter(
            (shot) => uniqueShotIds.includes(shot.id) && shot.continuitySnapshot?.snapshotHash,
          )
          .map((shot) => [shot.id, shot.continuitySnapshot!.snapshotHash]),
      ),
    };
    await this.mutateRun(runId, (current) => ({
      ...current,
      approvals: [...current.approvals, approval],
    }));
    return approval;
  }

  estimatePlanEnhancementCost() {
    const model = getModel('gemini-3.6-flash');
    if (!model) throw new Error('Gemini plan-enhancement pricing is unavailable.');
    return estimateMaximumModelCost(model, {
      estimatedInputTokens: 4_000,
      estimatedOutputTokens: 4_000,
    });
  }

  async consumePlanEnhancementApproval(runId: string, approvalId: string): Promise<ProductionRun> {
    return this.mutateRun(runId, (run) => {
      const approval = run.approvals.find((item) => item.id === approvalId);
      if (
        !approval ||
        approval.kind !== 'plan-enhancement' ||
        approval.status !== 'active' ||
        approval.consumedSubmissions >= approval.submissionAllowance
      ) {
        throw new Error('No active Gemini plan-enhancement approval is available.');
      }
      return {
        ...run,
        approvals: run.approvals.map((item) =>
          item.id === approvalId
            ? {
                ...item,
                consumedSubmissions: item.consumedSubmissions + 1,
                status: 'consumed',
              }
            : item,
        ),
      };
    });
  }

  async applyPlanEnhancement(runId: string, enhancedBrief: string): Promise<ProductionRun> {
    return this.mutateRun(runId, (run) => ({
      ...run,
      brief: enhancedBrief.trim() || run.brief,
      source: 'mixed',
      planRevision: run.planRevision + 1,
    }));
  }

  async updateShotRequest(
    runId: string,
    shotId: number,
    updates: Partial<ProductionShot['generationRequest']>,
    estimatedCostUsd: number,
    continuity?: {
      request: ProductionShot['generationRequest'];
      snapshot: ProductionShot['continuitySnapshot'];
      report: ProductionShot['continuityReport'];
    },
  ): Promise<ProductionRun> {
    return this.mutateRun(runId, (run) => ({
      ...run,
      status: 'awaiting-approval',
      cost: { ...run.cost, estimatedUsd: estimatedCostUsd },
      approvals: run.approvals.map((approval) =>
        approval.status === 'active' && approval.shotIds.includes(shotId)
          ? { ...approval, status: 'revoked' }
          : approval,
      ),
      shots: run.shots.map((shot) =>
        shot.id === shotId
          ? {
              ...shot,
              prompt: updates.prompt ?? shot.prompt,
              status: 'awaiting-approval',
              revisionPrompt: updates.prompt ? undefined : shot.revisionPrompt,
              continuitySnapshot: continuity?.snapshot,
              continuityReport: continuity?.report,
              generationRequest: continuity?.request ?? { ...shot.generationRequest, ...updates },
            }
          : shot,
      ),
    }));
  }

  async recordContinuityOverride(
    runId: string,
    override: ContinuityOverrideRecord,
  ): Promise<ProductionRun> {
    return this.mutateRun(runId, (run) => {
      const shot = run.shots.find((candidate) => candidate.id === override.shotId);
      if (!shot?.continuitySnapshot || !shot.continuityReport) {
        throw new Error('A compiled continuity snapshot is required before recording an override.');
      }
      if (shot.continuitySnapshot.snapshotHash !== override.snapshotHash) {
        throw new Error('This continuity override is stale because the shot snapshot changed.');
      }
      const warningCodes = new Set(
        shot.continuityReport.issues
          .filter((issue) => issue.severity === 'warning')
          .map((issue) => issue.code),
      );
      if (override.issueCodes.some((code) => !warningCodes.has(code))) {
        throw new Error('Continuity overrides may only document current soft warnings.');
      }
      const continuityOverrides = [
        ...(run.continuityOverrides ?? []).filter(
          (record) =>
            record.shotId !== override.shotId || record.snapshotHash !== override.snapshotHash,
        ),
        override,
      ];
      return { ...run, continuityOverrides };
    });
  }

  async splitLongShot(runId: string, shotId: number): Promise<ProductionRun> {
    return this.mutateRun(runId, (run) => {
      const shot = run.shots.find((item) => item.id === shotId);
      if (!shot) {
        throw new Error(`Production shot ${shotId} was not found.`);
      }
      assertCurrentContinuitySnapshot(shot);
      if (shot.durationSeconds <= 8) {
        throw new Error('Only shots longer than eight seconds need splitting.');
      }

      const segmentCount = Math.ceil(shot.durationSeconds / 8);
      const nextId = Math.max(...run.shots.map((item) => item.id)) + 1;
      const segments: ProductionShot[] = Array.from({ length: segmentCount }, (_, index) => {
        const remainingDuration = shot.durationSeconds - index * 8;
        const durationSeconds = normalizeSegmentDuration(Math.min(8, remainingDuration));
        return {
          ...shot,
          id: index === 0 ? shot.id : nextId + index - 1,
          sourceShotId: shot.sourceShotId ?? shot.id,
          title: `${shot.title} — Segment ${index + 1}/${segmentCount}`,
          prompt:
            index === 0
              ? shot.prompt
              : `${shot.prompt}\nContinue seamlessly from segment ${index} with matching subject, camera, motion, lighting, and audio.`,
          durationSeconds,
          status: 'awaiting-approval',
          generationRequest: {
            ...shot.generationRequest,
            prompt:
              index === 0
                ? shot.generationRequest.prompt
                : `${shot.generationRequest.prompt}\nContinue seamlessly from segment ${index}.`,
            durationSeconds,
          },
          takes: [],
          selectedTakeId: undefined,
          revisionPrompt: undefined,
        };
      });
      const shots = run.shots.flatMap((item) => (item.id === shotId ? segments : [item]));
      return {
        ...run,
        status: 'awaiting-approval',
        planRevision: run.planRevision + 1,
        shots,
        approvals: run.approvals.map((approval) =>
          approval.status === 'active' && approval.shotIds.includes(shotId)
            ? { ...approval, status: 'revoked' }
            : approval,
        ),
        cost: {
          ...run.cost,
          estimatedUsd: shots.reduce(
            (total, item) => total + veoGenerationService.estimateCost(item.generationRequest),
            0,
          ),
        },
      };
    });
  }

  async createApprovedTake(runId: string, shotId: number): Promise<ProductionTake> {
    let createdTake: ProductionTake | null = null;
    await this.mutateRun(runId, (run) => {
      const approvalIndex = run.approvals.findIndex(
        (approval) =>
          approval.status === 'active' &&
          approval.kind === 'generation-batch' &&
          approval.shotIds.includes(shotId) &&
          approval.consumedSubmissions < approval.submissionAllowance,
      );
      if (approvalIndex < 0) {
        throw new Error('No active generation approval is available for this shot.');
      }
      const approval = run.approvals[approvalIndex];
      if (!approval.sourceUrl || !approval.verifiedDate || !approval.confidence) {
        throw new Error(
          'This saved approval predates auditable pricing. Review and approve again.',
        );
      }
      const shot = run.shots.find((item) => item.id === shotId);
      if (!shot) {
        throw new Error(`Production shot ${shotId} was not found.`);
      }
      assertCurrentContinuitySnapshot(shot);
      const estimatedTakeCost = veoGenerationService.estimateCost(shot.generationRequest);
      if (!Number.isFinite(estimatedTakeCost) || estimatedTakeCost <= 0) {
        throw new Error(
          'Paid generation is blocked because the current model price is unavailable.',
        );
      }
      const currentSnapshotHash = shot.continuitySnapshot?.snapshotHash;
      const approvedSnapshotHash = approval.continuitySnapshotHashes?.[shotId];
      if (approvedSnapshotHash && approvedSnapshotHash !== currentSnapshotHash) {
        throw new Error(
          'This approval is stale because the shot continuity snapshot changed. Review and approve again.',
        );
      }
      const snapshotAssetHashes = shot.continuitySnapshot?.referenceAssetHashes ?? {};
      if (Object.keys(snapshotAssetHashes).length > 0) {
        const assets = useAppStore.getState().assets;
        const changedAsset = Object.entries(snapshotAssetHashes).find(([assetId, expectedHash]) => {
          const asset = assets.find((candidate) => candidate.id === assetId);
          return !asset || fingerprintAsset(asset) !== expectedHash;
        });
        if (changedAsset) {
          throw new Error(
            `This approval is stale because continuity asset ${changedAsset[0]} is missing or changed. Review and approve again.`,
          );
        }
      }
      const continuityBlockers = shot.continuityReport?.issues
        .filter((item) => item.severity === 'blocking')
        .map((item) => item.message);
      if (continuityBlockers && continuityBlockers.length > 0) {
        throw new Error(`Continuity preflight blocked generation. ${continuityBlockers.join(' ')}`);
      }
      const continuityWarnings = unresolvedContinuityWarnings([shot], run.continuityOverrides);
      if (continuityWarnings.length > 0) {
        throw new Error(
          `Continuity warning requires a documented override before generation. ${continuityWarnings.join(' ')}`,
        );
      }

      createdTake = {
        id: crypto.randomUUID(),
        prompt: shot.revisionPrompt || shot.prompt,
        request: {
          ...shot.generationRequest,
          prompt: shot.revisionPrompt || shot.prompt,
        },
        status: 'approved',
        provider: 'gemini-api',
        apiSurface: 'google-ai-v1beta',
        modelLifecycleSnapshot:
          getModel(shot.generationRequest.modelId)?.lifecycle === 'stable' ? 'stable' : 'preview',
        priceDimension: {
          unit: 'video-second',
          resolution: shot.generationRequest.resolution,
          usdPerUnit: veoGenerationService.getUnitPrice(shot.generationRequest),
        },
        costApproval: {
          approvalId: approval.id,
          modelId: shot.generationRequest.modelId,
          maximumChargeUsd: estimatedTakeCost,
          currency: 'USD',
          confidence: 'exact',
          sourceUrl: approval.sourceUrl,
          verifiedDate: approval.verifiedDate,
          approvedAt: approval.createdAt,
        },
        continuitySnapshot: shot.continuitySnapshot,
        continuityReport: shot.continuityReport,
        createdAt: Date.now(),
      };
      const approvals = run.approvals.map((approval, index) => {
        if (index !== approvalIndex) return approval;
        const consumedSubmissions = approval.consumedSubmissions + 1;
        return {
          ...approval,
          consumedSubmissions,
          status:
            consumedSubmissions >= approval.submissionAllowance &&
            approval.consumedReviews >= approval.reviewAllowance
              ? ('consumed' as const)
              : approval.status,
        };
      });

      return {
        ...run,
        status: 'generating',
        approvals,
        shots: run.shots.map((item) =>
          item.id === shotId
            ? { ...item, status: 'queued', takes: [...item.takes, createdTake!] }
            : item,
        ),
      };
    });
    if (!createdTake) {
      throw new Error('Failed to create an approved take.');
    }
    return createdTake;
  }

  async updateTake(
    runId: string,
    shotId: number,
    takeId: string,
    updates: Partial<ProductionTake>,
  ): Promise<ProductionRun> {
    return this.mutateRun(runId, (run) => {
      const shots = run.shots.map((shot) =>
        shot.id === shotId
          ? {
              ...shot,
              status: this.deriveShotStatus(
                updates.status ?? shot.takes.find((t) => t.id === takeId)?.status,
              ),
              takes: shot.takes.map((take) =>
                take.id === takeId ? { ...take, ...updates } : take,
              ),
            }
          : shot,
      );
      return {
        ...run,
        status: this.deriveRunStatus(shots, run.status),
        shots,
      };
    });
  }

  async recordReview(
    runId: string,
    shotId: number,
    takeId: string,
    review: ShotReviewResult,
  ): Promise<ProductionRun> {
    return this.mutateRun(runId, (run) => {
      const approvalIndex = run.approvals.findIndex(
        (approval) =>
          approval.status === 'active' &&
          approval.kind ===
            (review.source === 'mixed' ? 'continuity-review' : 'generation-batch') &&
          approval.shotIds.includes(shotId) &&
          approval.consumedReviews < approval.reviewAllowance,
      );
      if (approvalIndex < 0) {
        throw new Error('No active review approval is available for this shot.');
      }
      const shot = run.shots.find((item) => item.id === shotId);
      if (!shot) {
        throw new Error(`Production shot ${shotId} was not found.`);
      }
      assertCurrentContinuitySnapshot(shot);
      const currentSnapshotHash = shot.continuitySnapshot?.snapshotHash;
      const approvalSnapshotHash = run.approvals[approvalIndex].continuitySnapshotHashes?.[shotId];
      if (
        review.source === 'mixed' &&
        approvalSnapshotHash &&
        approvalSnapshotHash !== currentSnapshotHash
      ) {
        throw new Error(
          'This continuity review approval is stale because the shot snapshot changed. Approve the current snapshot again.',
        );
      }
      if (review.continuitySnapshotHash && review.continuitySnapshotHash !== currentSnapshotHash) {
        throw new Error(
          'This review is stale because the shot continuity snapshot changed. Review the current take again.',
        );
      }
      const approvals = run.approvals.map((approval, index) => {
        if (
          index !== approvalIndex ||
          approval.status !== 'active' ||
          !approval.shotIds.includes(shotId) ||
          approval.consumedReviews >= approval.reviewAllowance
        ) {
          return approval;
        }
        const consumedReviews = approval.consumedReviews + 1;
        return {
          ...approval,
          consumedReviews,
          status:
            consumedReviews >= approval.reviewAllowance &&
            approval.consumedSubmissions >= approval.submissionAllowance
              ? ('consumed' as const)
              : approval.status,
        };
      });
      const needsRevision = review.overallScore < 75;
      return {
        ...run,
        status: needsRevision ? 'needs-revision' : 'reviewing',
        approvals,
        shots: run.shots.map((shot) =>
          shot.id === shotId
            ? {
                ...shot,
                status: needsRevision ? 'needs-revision' : 'reviewing',
                revisionPrompt: needsRevision ? review.proposedRevisionPrompt : undefined,
                takes: shot.takes.map((take) => (take.id === takeId ? { ...take, review } : take)),
              }
            : shot,
        ),
      };
    });
  }

  async acceptTake(runId: string, shotId: number, takeId: string): Promise<ProductionRun> {
    return this.mutateRun(runId, (run) => {
      const shots: ProductionShot[] = run.shots.map((shot) => {
        if (shot.id !== shotId) return shot;
        const take = shot.takes.find((item) => item.id === takeId);
        if (!take) {
          throw new Error(`Production take ${takeId} was not found.`);
        }
        if (!take.localMediaKey && !take.mediaRiskWaived) {
          throw new Error('Cache the generated media locally or explicitly waive the media risk.');
        }
        return {
          ...shot,
          selectedTakeId: takeId,
          status: 'accepted',
          revisionPrompt: undefined,
          takes: shot.takes.map((item) =>
            item.id === takeId
              ? { ...item, status: 'accepted' }
              : item.status === 'accepted'
                ? { ...item, status: 'rejected' }
                : item,
          ),
        };
      });
      const complete = shots.every(
        (shot) => shot.status === 'accepted' || shot.status === 'skipped',
      );
      return {
        ...run,
        shots,
        status: complete ? 'complete' : 'reviewing',
        completedAt: complete ? Date.now() : run.completedAt,
      };
    });
  }

  async rejectTake(runId: string, shotId: number, takeId: string): Promise<ProductionRun> {
    return this.mutateRun(runId, (run) => ({
      ...run,
      status: 'needs-revision',
      shots: run.shots.map((shot) => {
        if (shot.id !== shotId) return shot;
        const take = shot.takes.find((item) => item.id === takeId);
        if (!take) {
          throw new Error(`Production take ${takeId} was not found.`);
        }
        return {
          ...shot,
          status: 'needs-revision',
          revisionPrompt: take.review?.proposedRevisionPrompt ?? shot.revisionPrompt,
          takes: shot.takes.map((item) =>
            item.id === takeId ? { ...item, status: 'rejected' } : item,
          ),
        };
      }),
    }));
  }

  async waiveMediaRisk(runId: string, shotId: number, takeId: string): Promise<ProductionRun> {
    return this.updateTake(runId, shotId, takeId, { mediaRiskWaived: true });
  }

  private async mutateRun(
    runId: string,
    mutation: (run: ProductionRun) => ProductionRun,
  ): Promise<ProductionRun> {
    const run = await this.getRun(runId);
    if (!run) {
      throw new Error(`Production run ${runId} was not found.`);
    }
    try {
      return await this.saveRun(mutation(run));
    } catch (error) {
      logger.error('ProductionRunService', 'Failed to update production run', error);
      throw error;
    }
  }

  private deriveShotStatus(status?: ProductionTake['status']): ProductionShot['status'] {
    switch (status) {
      case 'queued':
        return 'queued';
      case 'submitting':
        return 'submitting';
      case 'generating':
        return 'generating';
      case 'failed':
        return 'failed';
      case 'recovery-required':
        return 'recovery-required';
      case 'media-at-risk':
        return 'media-at-risk';
      case 'accepted':
        return 'accepted';
      default:
        return 'reviewing';
    }
  }

  private deriveRunStatus(
    shots: ProductionShot[],
    currentStatus: ProductionRun['status'],
  ): ProductionRun['status'] {
    const statuses = shots.map((shot) => shot.status);
    if (statuses.every((status) => status === 'accepted' || status === 'skipped'))
      return 'complete';
    if (statuses.some((status) => ['queued', 'submitting', 'generating'].includes(status))) {
      return 'generating';
    }
    if (statuses.some((status) => ['recovery-required', 'media-at-risk'].includes(status))) {
      return 'paused';
    }
    if (statuses.some((status) => status === 'needs-revision')) return 'needs-revision';
    if (statuses.some((status) => status === 'reviewing')) return 'reviewing';
    if (statuses.some((status) => status === 'failed')) return 'failed';
    return currentStatus;
  }
}

export const productionRunService = ProductionRunService.getInstance();
