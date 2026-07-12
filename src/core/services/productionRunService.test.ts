import { beforeEach, describe, expect, it, vi } from 'vitest';

import { INITIAL_STATE } from '@core/constants';
import type { ProductionRun } from '@core/types';

const { records, mockEmit } = vi.hoisted(() => ({
  records: new Map<string, unknown>(),
  mockEmit: vi.fn(),
}));

vi.mock('idb-keyval', () => ({
  createStore: vi.fn(() => 'run-store'),
  get: vi.fn(async (key: string) => records.get(key)),
  set: vi.fn(async (key: string, value: unknown) => records.set(key, value)),
  del: vi.fn(async (key: string) => records.delete(key)),
  keys: vi.fn(async () => [...records.keys()]),
}));

vi.mock('@core/services/loggerService', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('@core/store/mediator', () => ({
  storeMediator: { emit: mockEmit },
}));

import { productionRunService } from './productionRunService';

const makeRun = (): ProductionRun => ({
  schemaVersion: 2,
  id: 'run-1',
  projectId: 'project-1',
  title: 'Director Run',
  status: 'awaiting-approval',
  brief: 'A cinematic night market chase.',
  source: 'local',
  planRevision: 1,
  promptSnapshot: { ...INITIAL_STATE, idea: 'A cinematic night market chase.' },
  assetIds: [],
  shots: [
    {
      id: 1,
      title: 'Shot 1',
      prompt: 'A courier runs through a cinematic night market.',
      negativePrompt: '',
      camera: 'Tracking shot',
      durationSeconds: 8,
      status: 'awaiting-approval',
      generationRequest: {
        mode: 'text-to-video',
        modelId: 'veo-3.1-fast',
        prompt: 'A courier runs through a cinematic night market.',
        aspectRatio: '16:9',
        resolution: '720p',
        durationSeconds: 8,
        referenceAssetIds: [],
      },
      takes: [],
    },
  ],
  approvals: [],
  cost: {
    estimatedUsd: 0.8,
    approvedUsd: 0,
    recordedUsd: 0,
    pricingEffectiveDate: '2026-07-10',
  },
  createdAt: 1,
  updatedAt: 1,
});

describe('productionRunService', () => {
  beforeEach(() => {
    records.clear();
    mockEmit.mockClear();
  });

  it('persists and lists runs by project', async () => {
    await productionRunService.createRun(makeRun());
    const runs = await productionRunService.getRunsForProject('project-1');

    expect(runs).toHaveLength(1);
    expect(runs[0].id).toBe('run-1');
    expect(mockEmit).toHaveBeenCalledWith(
      'production:runUpdated',
      expect.objectContaining({ runId: 'run-1' }),
    );
  });

  it('leaves existing v6 project, task, and asset records untouched', async () => {
    const legacyProject = { id: 'project-v6', name: 'Existing project' };
    const legacyTask = { id: 'task-v6', status: 'Complete' };
    const legacyAsset = { id: 'asset-v6', type: 'video' };
    records.set('project:project-v6', legacyProject);
    records.set('generation-task:task-v6', legacyTask);
    records.set('asset:asset-v6', legacyAsset);

    await productionRunService.createRun(makeRun());
    await productionRunService.getRunsForProject('project-1');
    await productionRunService.deleteRun('run-1');

    expect(records.get('project:project-v6')).toEqual(legacyProject);
    expect(records.get('generation-task:task-v6')).toEqual(legacyTask);
    expect(records.get('asset:asset-v6')).toEqual(legacyAsset);
  });

  it('consumes one approved submission without allowing an automatic retake', async () => {
    await productionRunService.createRun(makeRun());
    await productionRunService.approveShots('run-1', [1], 0.8);

    const take = await productionRunService.createApprovedTake('run-1', 1);
    expect(take.status).toBe('approved');
    await expect(productionRunService.createApprovedTake('run-1', 1)).rejects.toThrow(
      'No active generation approval',
    );
  });

  it('consumes one structured review without silently repeating it', async () => {
    await productionRunService.createRun(makeRun());
    await productionRunService.approveShots('run-1', [1], 0.8);
    const take = await productionRunService.createApprovedTake('run-1', 1);
    const review = {
      id: 'review-1',
      shotId: 1,
      takeId: take.id,
      source: 'local' as const,
      overallScore: 80,
      dimensions: [
        { id: 'prompt-adherence' as const, score: 82, summary: 'Prompt is followed.' },
        { id: 'subject-continuity' as const, score: 80, summary: 'Subject is stable.' },
        { id: 'composition' as const, score: 84, summary: 'Composition is clear.' },
        { id: 'motion' as const, score: 78, summary: 'Motion is coherent.' },
        { id: 'audio' as const, score: 76, summary: 'Audio is usable.' },
      ],
      findings: [],
      createdAt: Date.now(),
    };

    await productionRunService.recordReview('run-1', 1, take.id, review);
    await expect(productionRunService.recordReview('run-1', 1, take.id, review)).rejects.toThrow(
      'No active review approval',
    );
  });

  it('consumes a separately approved Gemini planning call exactly once', async () => {
    await productionRunService.createRun(makeRun());
    const approval = await productionRunService.approvePlanEnhancement('run-1');

    await productionRunService.consumePlanEnhancementApproval('run-1', approval.id);
    await expect(
      productionRunService.consumePlanEnhancementApproval('run-1', approval.id),
    ).rejects.toThrow('No active Gemini plan-enhancement approval');

    const enhanced = await productionRunService.applyPlanEnhancement(
      'run-1',
      'Enhanced continuity and camera plan.',
    );
    expect(enhanced.source).toBe('mixed');
    expect(enhanced.planRevision).toBe(2);
    expect(enhanced.brief).toContain('Enhanced continuity');
  });

  it('marks ambiguous legacy submissions for manual recovery', async () => {
    const run = makeRun();
    run.status = 'generating';
    run.shots[0].status = 'submitting';
    run.shots[0].takes = [
      {
        id: 'take-ambiguous',
        prompt: run.shots[0].prompt,
        request: run.shots[0].generationRequest,
        status: 'submitting',
        provider: 'gemini-api',
        apiSurface: 'google-ai-v1beta',
        modelLifecycleSnapshot: 'preview',
        priceDimension: { unit: 'video-second', resolution: '720p', usdPerUnit: 0.1 },
        createdAt: 2,
      },
    ];
    records.set('production-run:run-1', run);

    const recovered = await productionRunService.getRun('run-1');
    expect(recovered?.status).toBe('paused');
    expect(recovered?.shots[0].status).toBe('recovery-required');
    expect(recovered).toMatchObject({
      schemaVersion: 2,
      shots: [
        expect.objectContaining({
          takes: [
            expect.objectContaining({
              provider: 'gemini-api',
              apiSurface: 'google-ai-v1beta',
              modelLifecycleSnapshot: 'preview',
              priceDimension: expect.objectContaining({ unit: 'video-second' }),
            }),
          ],
        }),
      ],
    });
    expect(recovered?.shots[0].takes[0].status).toBe('recovery-required');
  });

  it('requires a local cache or explicit waiver before acceptance', async () => {
    await productionRunService.createRun(makeRun());
    await productionRunService.approveShots('run-1', [1], 0.8);
    const take = await productionRunService.createApprovedTake('run-1', 1);
    await productionRunService.updateTake('run-1', 1, take.id, { status: 'complete' });

    await expect(productionRunService.acceptTake('run-1', 1, take.id)).rejects.toThrow(
      'Cache the generated media',
    );
    await productionRunService.waiveMediaRisk('run-1', 1, take.id);
    const accepted = await productionRunService.acceptTake('run-1', 1, take.id);
    expect(accepted.status).toBe('complete');
    expect(accepted.shots[0].status).toBe('accepted');
  });

  it('revokes an active approval when generation settings change', async () => {
    await productionRunService.createRun(makeRun());
    const approval = await productionRunService.approveShots('run-1', [1], 0.8);
    const updated = await productionRunService.updateShotRequest(
      'run-1',
      1,
      { resolution: '1080p' },
      0.96,
    );

    expect(updated.approvals.find((item) => item.id === approval.id)?.status).toBe('revoked');
    expect(updated.shots[0].status).toBe('awaiting-approval');
  });

  it('splits a long shot into separately approved Veo-safe segments', async () => {
    const run = makeRun();
    run.shots[0].durationSeconds = 14;
    await productionRunService.createRun(run);

    const split = await productionRunService.splitLongShot('run-1', 1);

    expect(split.planRevision).toBe(2);
    expect(split.shots).toHaveLength(2);
    expect(split.shots.map((shot) => shot.generationRequest.durationSeconds)).toEqual([8, 6]);
    expect(split.shots.every((shot) => shot.status === 'awaiting-approval')).toBe(true);
    expect(split.shots[1].prompt).toContain('Continue seamlessly');
  });

  it('rejects a reviewed take and prepares its proposed prompt for a new approval', async () => {
    await productionRunService.createRun(makeRun());
    await productionRunService.approveShots('run-1', [1], 0.8);
    const take = await productionRunService.createApprovedTake('run-1', 1);
    await productionRunService.updateTake('run-1', 1, take.id, {
      status: 'complete',
      review: {
        id: 'review-1',
        shotId: 1,
        takeId: take.id,
        overallScore: 70,
        dimensions: [],
        findings: [],
        proposedRevisionPrompt: 'Preserve subject identity and smooth the camera motion.',
        source: 'local',
        createdAt: 2,
      },
    });

    const rejected = await productionRunService.rejectTake('run-1', 1, take.id);
    expect(rejected.status).toBe('needs-revision');
    expect(rejected.shots[0].takes[0].status).toBe('rejected');
    expect(rejected.shots[0].revisionPrompt).toContain('Preserve subject identity');

    const prepared = await productionRunService.updateShotRequest(
      'run-1',
      1,
      { prompt: rejected.shots[0].revisionPrompt },
      0.8,
    );
    expect(prepared.status).toBe('awaiting-approval');
    expect(prepared.shots[0].prompt).toContain('Preserve subject identity');
    await expect(productionRunService.createApprovedTake('run-1', 1)).rejects.toThrow(
      'No active generation approval',
    );
  });
});
