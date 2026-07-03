import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test-utils';
import { INITIAL_STATE } from '@core/constants';
import type { PromptSuggestion, Shot } from '@core/types';
import { OptimizePage } from './OptimizePage';

const { mockApplyPatch, mockApplySuggestion, mockDismissSuggestion, mockSetPromptState } =
  vi.hoisted(() => ({
    mockApplyPatch: vi.fn(),
    mockApplySuggestion: vi.fn(),
    mockDismissSuggestion: vi.fn(),
    mockSetPromptState: vi.fn(),
  }));

const suggestion: PromptSuggestion = {
  id: 'suggestion-1',
  promptId: 'project-1',
  category: 'lighting',
  original: '',
  suggested: 'Add neon rim lighting',
  reasoning: 'Clarifies production lighting.',
  status: 'pending',
  confidence: 0.84,
  source: 'heuristic',
  patch: {
    target: 'prompt',
    field: 'lightingStyle',
    value: 'neon rim lighting',
    append: true,
  },
};

const shot: Shot = {
  id: 1,
  type: 'video',
  action: 'Runner crosses an alley',
  camera: 'Slow dolly in',
  characterId: 'runner',
  takes: [],
  selectedTakeIndex: 0,
  visualLink: true,
  duration: 8,
  transition: {
    type: 'cut',
    duration: 0,
  },
};

const mockAppState = {
  promptState: {
    ...INITIAL_STATE,
    idea: 'Neon alley chase',
  },
  setPromptState: mockSetPromptState,
  sbShots: [shot],
  setSbShots: vi.fn(),
  assets: [],
};

const mockOptimizationState = {
  analysisResults: {
    'project-1': {
      projectId: 'project-1',
      promptId: 'project-1',
      status: 'ready',
      suggestions: [suggestion],
      assetTags: {},
      costEstimate: null,
      narrativeIssues: [],
      presetRecommendation: null,
      source: 'heuristic',
      startedAt: 1,
      completedAt: 2,
    },
  },
  analysisStatus: {
    'project-1': 'ready',
  },
  suggestions: {
    'project-1': [suggestion],
  },
  costEstimates: {},
  narrativeIssues: [],
  presetRecommendation: null,
  setPresetRecommendation: vi.fn(),
  applySuggestion: mockApplySuggestion,
  dismissSuggestion: mockDismissSuggestion,
};

vi.mock('@core/store/useAppStore', () => ({
  useAppStore: (selector: (state: typeof mockAppState) => unknown) => selector(mockAppState),
}));

vi.mock('@core/store/useOptimizationStore', () => ({
  useOptimizationStore: (selector: (state: typeof mockOptimizationState) => unknown) =>
    selector(mockOptimizationState),
}));

vi.mock('@core/store/useProjectStore', () => ({
  useProjectStore: (selector: (state: { currentProjectId: string }) => unknown) =>
    selector({ currentProjectId: 'project-1' }),
}));

vi.mock('@core/services', () => ({
  creativePackExportService: {
    buildCreativePack: vi.fn(() => ({ title: 'Neon alley chase' })),
    exportCreativePack: vi.fn(() => '# Creative Pack\n\n## Flow/Veo Scene Pack'),
  },
}));

vi.mock('@core/services/optimizationOrchestratorService', () => ({
  optimizationOrchestratorService: {
    analyzeProject: vi.fn(),
    applySuggestionPatch: mockApplyPatch,
  },
}));

vi.mock('@core/services/loggerService', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('OptimizePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApplySuggestion.mockReturnValue(suggestion);
    mockApplyPatch.mockReturnValue({
      promptStatePatch: {
        lightingStyle: 'neon rim lighting',
      },
    });
  });

  it('renders the workbench and Creative Pack preview', () => {
    render(<OptimizePage />);

    expect(screen.getByRole('heading', { name: /optimization workbench/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Creative Pack export preview')).toHaveValue(
      '# Creative Pack\n\n## Flow/Veo Scene Pack',
    );
    expect(screen.getByText('Add neon rim lighting')).toBeInTheDocument();
  });

  it('applies accepted suggestion patches to the prompt state', async () => {
    const { user } = render(<OptimizePage />);

    await user.click(screen.getByRole('button', { name: /apply/i }));

    expect(mockApplySuggestion).toHaveBeenCalledWith('project-1', 'suggestion-1');
    expect(mockApplyPatch).toHaveBeenCalledWith(
      expect.objectContaining({
        suggestion,
      }),
    );
    expect(mockSetPromptState).toHaveBeenCalledWith({
      lightingStyle: 'neon rim lighting',
    });
  });
});
