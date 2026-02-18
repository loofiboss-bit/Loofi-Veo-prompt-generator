import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@/test-utils';
import { ConflictResolutionPanel } from './ConflictResolutionPanel';

const makeConflict = (overrides = {}) => ({
  id: 'conflict-1',
  dataType: 'shot',
  elementId: 42,
  description: 'Shot title was changed by two users',
  localValue: 'My Title',
  remoteValue: 'Their Title',
  mergedValue: 'My Title (merged)',
  remoteUserId: 'user-2',
  remoteUserName: 'Bob',
  timestamp: Date.now() - 5000,
  status: 'pending' as const,
  ...overrides,
});

// Mutable store state — tests can mutate mockState.conflicts directly
const mockState = {
  conflicts: [] as ReturnType<typeof makeConflict>[],
  resolveConflict: vi.fn(),
  clearResolvedConflicts: vi.fn(),
};

vi.mock('@core/store/useCollaborationStore', () => ({
  useCollaborationStore: () => mockState,
}));

vi.mock('@core/services/loggerService', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

describe('ConflictResolutionPanel', () => {
  afterEach(() => {
    mockState.conflicts = [];
  });

  it('renders nothing when there are no pending conflicts', () => {
    const { container } = render(<ConflictResolutionPanel />);
    expect(container.firstChild).toBeNull();
  });

  it('renders conflict panel when pending conflicts exist', () => {
    mockState.conflicts = [makeConflict()];
    render(<ConflictResolutionPanel />);
    expect(screen.getByText('Merge Conflicts')).toBeInTheDocument();
    expect(screen.getByText('Shot title was changed by two users')).toBeInTheDocument();
  });

  it('shows the conflict count badge', () => {
    mockState.conflicts = [
      makeConflict(),
      makeConflict({ id: 'conflict-2', description: 'Another conflict' }),
    ];
    render(<ConflictResolutionPanel />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
