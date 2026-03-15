import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test-utils';
import { OptimizePanel } from './OptimizePanel';
import { InlineSuggestions } from './InlineSuggestions';
import type { PresetRecommendation } from '@core/types';

const { mockTogglePanel, mockSetPresetRecommendation } = vi.hoisted(() => ({
  mockTogglePanel: vi.fn(),
  mockSetPresetRecommendation: vi.fn(),
}));

type OptimizationStoreMockState = {
  panelOpen: boolean;
  togglePanel: typeof mockTogglePanel;
  costEstimates: Record<string, unknown>;
  suggestions: Record<string, unknown>;
  qualityScores: Record<string, unknown>;
  narrativeChecks: Record<string, unknown>;
  narrativeIssues: unknown[];
  isAnalyzing: boolean;
  updateSuggestionStatus: ReturnType<typeof vi.fn>;
  addHistoryEntry: ReturnType<typeof vi.fn>;
  presetRecommendation: PresetRecommendation | null;
  setPresetRecommendation: typeof mockSetPresetRecommendation;
};

let mockOptimizationState: OptimizationStoreMockState = {
  panelOpen: true,
  togglePanel: mockTogglePanel,
  costEstimates: {},
  suggestions: {},
  qualityScores: {},
  narrativeChecks: {},
  narrativeIssues: [],
  isAnalyzing: false,
  updateSuggestionStatus: vi.fn(),
  addHistoryEntry: vi.fn(),
  presetRecommendation: null,
  setPresetRecommendation: mockSetPresetRecommendation,
};

vi.mock('@core/store/useOptimizationStore', () => ({
  useOptimizationStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector(mockOptimizationState),
}));

vi.mock('@core/services/loggerService', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

describe('OptimizePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOptimizationState = {
      panelOpen: true,
      togglePanel: mockTogglePanel,
      costEstimates: {},
      suggestions: {},
      qualityScores: {},
      narrativeChecks: {},
      narrativeIssues: [],
      isAnalyzing: false,
      updateSuggestionStatus: vi.fn(),
      addHistoryEntry: vi.fn(),
      presetRecommendation: null,
      setPresetRecommendation: mockSetPresetRecommendation,
    };
  });

  const recommendation: PresetRecommendation = {
    modelId: 'veo',
    profileId: 'balanced',
    confidence: 0.82,
    reasoning: ['Balanced profile fits the current prompt complexity.'],
    complexityVector: {
      cinematic: 0.8,
      motion: 0.4,
      audio: 0.2,
    },
  };

  it('renders the panel heading when open', () => {
    render(<OptimizePanel promptId="test-project" />);
    expect(screen.getByRole('complementary')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    const { user } = render(<OptimizePanel promptId="test-project" onClose={onClose} />);
    const closeBtn = screen.getByRole('button', { name: /close|✕/i });
    await user.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('dismisses the preset recommendation from the panel', async () => {
    mockOptimizationState = {
      ...mockOptimizationState,
      presetRecommendation: recommendation,
    };

    const { user } = render(<OptimizePanel promptId="test-project" />);

    await user.click(screen.getByRole('button', { name: 'Dismiss' }));

    expect(mockSetPresetRecommendation).toHaveBeenCalledWith(null);
  });

  it('applies the preset recommendation when requested', async () => {
    mockOptimizationState = {
      ...mockOptimizationState,
      presetRecommendation: recommendation,
    };

    const onApplyPreset = vi.fn();
    const { user } = render(
      <OptimizePanel promptId="test-project" onApplyPreset={onApplyPreset} />,
    );

    await user.click(screen.getByRole('button', { name: 'Apply preset' }));

    expect(onApplyPreset).toHaveBeenCalledWith('veo', 'balanced');
  });
});

describe('InlineSuggestions', () => {
  it('renders without crashing when there are no suggestions', () => {
    const { container } = render(<InlineSuggestions promptId="test-project" />);
    expect(container).toBeTruthy();
  });
});
