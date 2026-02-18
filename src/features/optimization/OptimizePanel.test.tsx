import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test-utils';
import { OptimizePanel } from './OptimizePanel';
import { InlineSuggestions } from './InlineSuggestions';

vi.mock('@core/store/useOptimizationStore', () => ({
  useOptimizationStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      panelOpen: true,
      togglePanel: vi.fn(),
      costEstimates: {},
      suggestions: {},
      qualityScores: {},
      narrativeChecks: {},
      narrativeIssues: [],
      isAnalyzing: false,
      updateSuggestionStatus: vi.fn(),
      addHistoryEntry: vi.fn(),
    }),
}));

vi.mock('@core/services/loggerService', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

describe('OptimizePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
});

describe('InlineSuggestions', () => {
  it('renders without crashing when there are no suggestions', () => {
    const { container } = render(<InlineSuggestions promptId="test-project" />);
    expect(container).toBeTruthy();
  });
});
