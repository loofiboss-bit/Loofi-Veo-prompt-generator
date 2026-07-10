import { beforeEach, describe, expect, it, vi } from 'vitest';

import { INITIAL_STATE } from '@core/constants';
import type { ProductionRun } from '@core/types';

const { mockApproveShots, mockBuildLocalPlan, mockCreateRun, mockGetRun, mockGetRunsForProject } =
  vi.hoisted(() => ({
    mockApproveShots: vi.fn(),
    mockBuildLocalPlan: vi.fn(),
    mockCreateRun: vi.fn(),
    mockGetRun: vi.fn(),
    mockGetRunsForProject: vi.fn(),
  }));

vi.mock('@core/services/directorPlanningService', () => ({
  directorPlanningService: { buildLocalPlan: mockBuildLocalPlan },
}));

vi.mock('@core/services/productionRunService', () => ({
  productionRunService: {
    getRunsForProject: mockGetRunsForProject,
    createRun: mockCreateRun,
    getRun: mockGetRun,
    approveShots: mockApproveShots,
    updateShotRequest: vi.fn(),
  },
}));

vi.mock('@core/services/veoGenerationService', () => ({
  veoGenerationService: { estimateCost: vi.fn(() => 0.8) },
}));

import { useProductionRunStore } from './useProductionRunStore';

const run: ProductionRun = {
  schemaVersion: 1,
  id: 'run-1',
  projectId: 'project-1',
  title: 'Director Run',
  status: 'awaiting-approval',
  brief: 'A local production plan',
  source: 'local',
  planRevision: 1,
  promptSnapshot: INITIAL_STATE,
  assetIds: [],
  shots: [
    {
      id: 1,
      title: 'Shot 1',
      prompt: 'A cinematic shot with clear camera motion.',
      negativePrompt: '',
      camera: 'Dolly in',
      durationSeconds: 8,
      status: 'awaiting-approval',
      generationRequest: {
        mode: 'text-to-video',
        modelId: 'veo-3.1-fast-generate-preview',
        prompt: 'A cinematic shot with clear camera motion.',
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
};

describe('useProductionRunStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useProductionRunStore.setState(useProductionRunStore.getInitialState(), true);
  });

  it('hydrates the newest project run without cloud work', async () => {
    mockGetRunsForProject.mockResolvedValue([run]);
    await useProductionRunStore.getState().initialize('project-1');

    expect(useProductionRunStore.getState().activeRun?.id).toBe('run-1');
    expect(useProductionRunStore.getState().hydratedProjectId).toBe('project-1');
    expect(mockBuildLocalPlan).not.toHaveBeenCalled();
  });

  it('creates and selects a local plan', async () => {
    mockBuildLocalPlan.mockReturnValue(run);
    mockCreateRun.mockResolvedValue(run);

    await useProductionRunStore.getState().createLocalPlan({
      projectId: 'project-1',
      title: 'Director Run',
      promptState: INITIAL_STATE,
    });

    expect(useProductionRunStore.getState().activeRun?.id).toBe('run-1');
    expect(useProductionRunStore.getState().selectedShotIds).toEqual([1]);
  });

  it('approves selected shots with their exact maximum estimate', async () => {
    useProductionRunStore.setState({ activeRun: run, runs: [run], selectedShotIds: [1] });
    mockGetRun.mockResolvedValue({
      ...run,
      shots: [{ ...run.shots[0], status: 'approved' }],
    });

    await useProductionRunStore.getState().approveSelectedShots();

    expect(mockApproveShots).toHaveBeenCalledWith('run-1', [1], 0.8);
    expect(useProductionRunStore.getState().selectedShotIds).toEqual([]);
  });
});
