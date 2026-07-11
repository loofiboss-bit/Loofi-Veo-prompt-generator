import { beforeEach, describe, expect, it, vi } from 'vitest';

import { render, screen } from '@/test-utils';
import { INITIAL_STATE } from '@core/constants';
import type { ProductionRun, Shot } from '@core/types';

const {
  mockApproveSelectedShots,
  mockCreateApprovedTake,
  mockCreateLocalPlan,
  mockEnhancePlanBrief,
  mockInitialize,
  mockRejectTake,
  mockStartGenerationRequest,
  mockSplitLongShot,
  mockUpdateShotRequest,
} = vi.hoisted(() => ({
  mockApproveSelectedShots: vi.fn(),
  mockCreateApprovedTake: vi.fn(),
  mockCreateLocalPlan: vi.fn(),
  mockEnhancePlanBrief: vi.fn(),
  mockInitialize: vi.fn(),
  mockRejectTake: vi.fn(),
  mockStartGenerationRequest: vi.fn(),
  mockSplitLongShot: vi.fn(),
  mockUpdateShotRequest: vi.fn(),
}));

const storyboardShot: Shot = {
  id: 1,
  type: 'video',
  action: 'A courier runs through a neon market',
  camera: 'Tracking shot',
  characterId: '',
  takes: [],
  selectedTakeIndex: 0,
  visualLink: false,
  duration: 8,
  transition: { type: 'cut', duration: 0 },
};

const makeRun = (status: ProductionRun['shots'][number]['status']): ProductionRun => ({
  schemaVersion: 1,
  id: 'run-1',
  projectId: 'project-1',
  title: 'Director Run',
  status: status === 'approved' ? 'awaiting-approval' : 'awaiting-approval',
  brief: 'Neon market chase',
  source: 'local',
  planRevision: 1,
  promptSnapshot: { ...INITIAL_STATE, idea: 'Neon market chase' },
  assetIds: [],
  shots: [
    {
      id: 1,
      title: 'Shot 1',
      prompt: 'A courier runs through a neon market with a tracking camera.',
      negativePrompt: '',
      camera: 'Tracking shot',
      durationSeconds: 8,
      status,
      generationRequest: {
        mode: 'text-to-video',
        modelId: 'veo-3.1-fast',
        prompt: 'A courier runs through a neon market with a tracking camera.',
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

const mockAppState = {
  promptState: { ...INITIAL_STATE, idea: 'Neon market chase' },
  sbShots: [storyboardShot],
  assets: [],
  setSbShots: vi.fn(),
  syncTimelineFromShots: vi.fn(),
};

let productionState: Record<string, unknown>;

vi.mock('@core/store/useAppStore', () => ({
  useAppStore: Object.assign(
    (selector: (state: typeof mockAppState) => unknown) => selector(mockAppState),
    { getState: () => mockAppState },
  ),
}));

vi.mock('@core/store/useProjectStore', () => ({
  useProjectStore: (
    selector: (state: { currentProjectId: string; projects: unknown[] }) => unknown,
  ) =>
    selector({
      currentProjectId: 'project-1',
      projects: [{ id: 'project-1', name: 'Neon Project' }],
    }),
}));

vi.mock('@core/store/useProductionRunStore', () => ({
  useProductionRunStore: () => productionState,
}));

vi.mock('@core/services/productionRunService', () => ({
  productionRunService: {
    approvePlanEnhancement: vi.fn().mockResolvedValue({ id: 'plan-approval-1' }),
    consumePlanEnhancementApproval: vi.fn(),
    applyPlanEnhancement: vi.fn(),
    createApprovedTake: mockCreateApprovedTake,
    updateTake: vi.fn(),
    recordReview: vi.fn(),
    acceptTake: vi.fn(),
    rejectTake: mockRejectTake,
    waiveMediaRisk: vi.fn(),
  },
}));

vi.mock('@core/services/directorPlanningService', () => ({
  directorPlanningService: { enhancePlanBrief: mockEnhancePlanBrief },
}));

vi.mock('@core/services/videoGenerationService', () => ({
  videoGenerationService: { startGenerationRequest: mockStartGenerationRequest },
}));

vi.mock('@core/services/mediaAssetService', () => ({
  mediaAssetService: { getRecord: vi.fn(), getObjectUrl: vi.fn() },
}));

vi.mock('@core/services/productionReviewService', () => ({
  productionReviewService: { reviewTake: vi.fn() },
}));

vi.mock('@core/services/creativePackExportService', () => ({
  creativePackExportService: {
    buildCreativePack: vi.fn(() => ({ title: 'Director Pack' })),
    exportCreativePack: vi.fn(() => '# Director Pack'),
  },
}));

vi.mock('@core/store/mediator', () => ({
  storeMediator: { emit: vi.fn() },
}));

import { DirectorPage } from './DirectorPage';

const makeProductionState = (activeRun: ProductionRun | null, selectedShotIds: number[] = []) => ({
  runs: activeRun ? [activeRun] : [],
  activeRun,
  selectedShotIds,
  isLoading: false,
  error: null,
  initialize: mockInitialize,
  createLocalPlan: mockCreateLocalPlan,
  selectRun: vi.fn(),
  toggleShotSelection: vi.fn(),
  selectAllPendingShots: vi.fn(),
  approveSelectedShots: mockApproveSelectedShots,
  updateShotRequest: mockUpdateShotRequest,
  splitLongShot: mockSplitLongShot,
  refreshActiveRun: vi.fn(),
});

describe('DirectorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    productionState = makeProductionState(null);
  });

  it('hydrates locally without making a generation call', () => {
    render(<DirectorPage />);

    expect(screen.getByRole('heading', { name: 'Create' })).toBeInTheDocument();
    expect(mockInitialize).toHaveBeenCalledWith('project-1');
    expect(mockStartGenerationRequest).not.toHaveBeenCalled();
  });

  it('creates a local plan only after the user requests it', async () => {
    const { user } = render(<DirectorPage />);
    await user.click(screen.getByRole('button', { name: /new local plan/i }));

    expect(mockCreateLocalPlan).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'project-1', title: 'Neon Project Director Run' }),
    );
    expect(mockStartGenerationRequest).not.toHaveBeenCalled();
  });

  it('makes one Gemini planning call only after a dedicated approval is consumed', async () => {
    const run = makeRun('awaiting-approval');
    productionState = makeProductionState(run);
    mockEnhancePlanBrief.mockResolvedValue('Enhanced Director brief');
    const { productionRunService } = await import('@core/services/productionRunService');
    const { user } = render(<DirectorPage />);

    expect(mockEnhancePlanBrief).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Approve 1 Gemini plan call' }));

    expect(productionRunService.approvePlanEnhancement).toHaveBeenCalledWith('run-1');
    expect(productionRunService.consumePlanEnhancementApproval).toHaveBeenCalledWith(
      'run-1',
      'plan-approval-1',
    );
    expect(mockEnhancePlanBrief).toHaveBeenCalledWith(run);
    expect(productionRunService.applyPlanEnhancement).toHaveBeenCalledWith(
      'run-1',
      'Enhanced Director brief',
    );
  });

  it('shows an exact approval ceiling for selected shots', async () => {
    productionState = makeProductionState(makeRun('awaiting-approval'), [1]);
    const { user } = render(<DirectorPage />);

    expect(screen.getByText('Maximum $0.80')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /approve 1 shot/i }));
    expect(mockApproveSelectedShots).toHaveBeenCalledOnce();
  });

  it('submits generation only for an already approved shot', async () => {
    const run = makeRun('approved');
    productionState = makeProductionState(run);
    const take = {
      id: 'take-1',
      prompt: run.shots[0].prompt,
      request: run.shots[0].generationRequest,
      status: 'approved' as const,
      createdAt: 1,
    };
    mockCreateApprovedTake.mockResolvedValue(take);
    mockStartGenerationRequest.mockResolvedValue('task-1');
    const { user } = render(<DirectorPage />);

    await user.click(screen.getByRole('button', { name: /generate approved take/i }));
    expect(mockCreateApprovedTake).toHaveBeenCalledWith('run-1', 1);
    expect(mockStartGenerationRequest).toHaveBeenCalledOnce();
  });

  it('requires a fresh approval after the user prepares a proposed revision', async () => {
    const run = makeRun('needs-revision');
    run.shots[0].takes = [
      {
        id: 'take-1',
        prompt: run.shots[0].prompt,
        request: run.shots[0].generationRequest,
        status: 'complete',
        providerMediaUri: 'https://example.com/take.mp4',
        review: {
          id: 'review-1',
          shotId: 1,
          takeId: 'take-1',
          overallScore: 70,
          dimensions: [],
          findings: [],
          proposedRevisionPrompt: 'Keep the courier stable and preserve tracking motion.',
          source: 'local',
          createdAt: 2,
        },
        createdAt: 1,
      },
    ];
    productionState = makeProductionState(run);
    const { user } = render(<DirectorPage />);

    await user.click(screen.getByRole('button', { name: 'Prepare revision' }));

    expect(mockRejectTake).toHaveBeenCalledWith('run-1', 1, 'take-1');
    expect(mockUpdateShotRequest).toHaveBeenCalledWith(1, {
      prompt: 'Keep the courier stable and preserve tracking motion.',
    });
    expect(mockStartGenerationRequest).not.toHaveBeenCalled();
  });
});
