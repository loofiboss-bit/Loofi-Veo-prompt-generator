import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test-utils';
import HistoryPanel from './HistoryPanel';
import type { HistoryEntry, PromptState } from '@core/types';

// Mock react-i18next so t(key) returns the key as-is
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
  I18nextProvider: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

vi.mock('@shared/components/ui/ConfirmDialog', () => ({
  ConfirmDialog: ({
    isOpen,
    onConfirm,
    onCancel,
  }: {
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    [key: string]: unknown;
  }) =>
    isOpen ? (
      <>
        <button data-testid="confirm-btn" onClick={onConfirm}>
          Confirm
        </button>
        <button data-testid="cancel-btn" onClick={onCancel}>
          Cancel
        </button>
      </>
    ) : null,
}));

// Mock the history store
const mockDeleteEntry = vi.fn();
const mockClearHistory = vi.fn();
const mockExportHistory = vi.fn().mockResolvedValue('{}');
const mockRateEntry = vi.fn();

vi.mock('@core/store/useHistoryStore', () => ({
  useHistoryStore: () => ({
    entries: mockEntries,
    deleteEntry: mockDeleteEntry,
    clearHistory: mockClearHistory,
    exportHistory: mockExportHistory,
    rateEntry: mockRateEntry,
    viewMode: 'list' as const,
    setViewMode: vi.fn(),
  }),
}));

// Shared test entries
let mockEntries: HistoryEntry[];

function makeEntry(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    id: 'entry-1',
    prompt: 'A cinematic shot of a sunset over the ocean',
    timestamp: Date.now() - 60_000,
    params: {
      idea: 'Sunset over ocean',
      artStyle: 'Cinematic',
      targetModel: 'veo',
      timeOfDay: 'Golden hour',
      weather: 'Clear',
      cameraMovement: 'Slow pan',
    } as PromptState,
    ...overrides,
  } as HistoryEntry;
}

describe('HistoryPanel', () => {
  const mockOnSelect = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockRateEntry.mockClear();
    mockEntries = [
      makeEntry({
        id: 'e1',
        params: {
          idea: 'Sunset over ocean',
          artStyle: 'Cinematic',
          targetModel: 'veo',
          timeOfDay: 'Sunset',
          weather: 'Clear',
          cameraMovement: 'Slow pan',
        } as PromptState,
      }),
      makeEntry({
        id: 'e2',
        prompt: 'A dramatic aerial view',
        params: {
          idea: 'Aerial city view',
          artStyle: 'Documentary',
          targetModel: 'sora',
          timeOfDay: 'Night',
          weather: 'Any',
          cameraMovement: 'Static shot',
        } as PromptState,
      }),
      makeEntry({
        id: 'e3',
        prompt: 'Abstract color patterns',
        params: {
          idea: 'Abstract art',
          artStyle: 'Custom',
          customArtStyle: 'Psychedelic',
          targetModel: 'veo',
          timeOfDay: 'Any',
          weather: 'Any',
          cameraMovement: 'Static shot',
        } as PromptState,
      }),
    ];
  });

  // ─── Rendering ──────────────────────────────────────────────────

  it('should render the panel title', () => {
    render(<HistoryPanel onSelect={mockOnSelect} onClose={mockOnClose} language="en" />);
    expect(screen.getByText('title')).toBeInTheDocument(); // i18n key returned as-is
  });

  it('should show the count of entries', () => {
    render(<HistoryPanel onSelect={mockOnSelect} onClose={mockOnClose} language="en" />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should render all history entries', () => {
    render(<HistoryPanel onSelect={mockOnSelect} onClose={mockOnClose} language="en" />);
    expect(screen.getByText('Sunset over ocean')).toBeInTheDocument();
    expect(screen.getByText('Aerial city view')).toBeInTheDocument();
    expect(screen.getByText('Abstract art')).toBeInTheDocument();
  });

  it('should show VEO/SORA model badges', () => {
    render(<HistoryPanel onSelect={mockOnSelect} onClose={mockOnClose} language="en" />);
    expect(screen.getAllByText('VEO').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('SORA').length).toBeGreaterThanOrEqual(1);
  });

  it('should render prompt snippets', () => {
    render(<HistoryPanel onSelect={mockOnSelect} onClose={mockOnClose} language="en" />);
    expect(screen.getByText('A cinematic shot of a sunset over the ocean')).toBeInTheDocument();
    expect(screen.getByText('A dramatic aerial view')).toBeInTheDocument();
  });

  it('should show parameter badges for non-default values', () => {
    render(<HistoryPanel onSelect={mockOnSelect} onClose={mockOnClose} language="en" />);
    expect(screen.getByText('Sunset')).toBeInTheDocument(); // timeOfDay
    expect(screen.getByText('Slow pan')).toBeInTheDocument(); // cameraMovement
    expect(screen.getByText('Documentary')).toBeInTheDocument(); // artStyle
    // Custom art style
    expect(screen.getByText('Psychedelic')).toBeInTheDocument();
  });

  // ─── Empty State ────────────────────────────────────────────────

  it('should show empty state when no entries', () => {
    mockEntries = [];
    render(<HistoryPanel onSelect={mockOnSelect} onClose={mockOnClose} language="en" />);
    expect(screen.getByText('empty')).toBeInTheDocument();
  });

  // ─── Close Button ───────────────────────────────────────────────

  it('should call onClose when close button is clicked', async () => {
    const { user } = render(
      <HistoryPanel onSelect={mockOnSelect} onClose={mockOnClose} language="en" />,
    );

    await user.click(screen.getByLabelText('Close history panel'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should call onClose on Escape key', () => {
    render(<HistoryPanel onSelect={mockOnSelect} onClose={mockOnClose} language="en" />);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(mockOnClose).toHaveBeenCalled();
  });

  // ─── Search ─────────────────────────────────────────────────────

  it('should filter entries by search query', async () => {
    const { user } = render(
      <HistoryPanel onSelect={mockOnSelect} onClose={mockOnClose} language="en" />,
    );

    const searchInput = screen.getByPlaceholderText('searchPlaceholder');
    await user.type(searchInput, 'Aerial');

    expect(screen.getByText('Aerial city view')).toBeInTheDocument();
    expect(screen.queryByText('Sunset over ocean')).not.toBeInTheDocument();
  });

  it('should show no matches state when search has no results', async () => {
    const { user } = render(
      <HistoryPanel onSelect={mockOnSelect} onClose={mockOnClose} language="en" />,
    );

    const searchInput = screen.getByPlaceholderText('searchPlaceholder');
    await user.type(searchInput, 'nonexistent query xyz');

    expect(screen.getByText('No matches found')).toBeInTheDocument();
  });

  it('should clear search query when clear button is clicked', async () => {
    const { user } = render(
      <HistoryPanel onSelect={mockOnSelect} onClose={mockOnClose} language="en" />,
    );

    const searchInput = screen.getByPlaceholderText('searchPlaceholder');
    await user.type(searchInput, 'test');

    await user.click(screen.getByRole('button', { name: 'clearSearch' }));

    expect(searchInput).toHaveValue('');
  });

  // ─── Model Filter ──────────────────────────────────────────────

  it('should filter by VEO model', async () => {
    const { user } = render(
      <HistoryPanel onSelect={mockOnSelect} onClose={mockOnClose} language="en" />,
    );

    // Click VEO filter button
    await user.click(screen.getByText('veo'));

    // Should show only VEO entries
    expect(screen.getByText('Sunset over ocean')).toBeInTheDocument();
    expect(screen.queryByText('Aerial city view')).not.toBeInTheDocument(); // SORA entry
  });

  it('should filter by SORA model', async () => {
    const { user } = render(
      <HistoryPanel onSelect={mockOnSelect} onClose={mockOnClose} language="en" />,
    );

    await user.click(screen.getByText('sora'));

    expect(screen.getByText('Aerial city view')).toBeInTheDocument();
    expect(screen.queryByText('Sunset over ocean')).not.toBeInTheDocument();
  });

  it('should show all models when All is clicked', async () => {
    const { user } = render(
      <HistoryPanel onSelect={mockOnSelect} onClose={mockOnClose} language="en" />,
    );

    // Filter first
    await user.click(screen.getByText('sora'));
    // Then show all
    await user.click(screen.getByText('All Models'));

    expect(screen.getByText('Sunset over ocean')).toBeInTheDocument();
    expect(screen.getByText('Aerial city view')).toBeInTheDocument();
  });

  // ─── Apply ──────────────────────────────────────────────────────

  it('should call onSelect when apply button is clicked', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { user } = render(
      <HistoryPanel onSelect={mockOnSelect} onClose={mockOnClose} language="en" />,
    );

    const useButtons = screen.getAllByText('use');
    await user.click(useButtons[0]);

    vi.advanceTimersByTime(600);
    expect(mockOnSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'e1' }));
    vi.useRealTimers();
  });

  it('should show applied state briefly', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { user } = render(
      <HistoryPanel onSelect={mockOnSelect} onClose={mockOnClose} language="en" />,
    );

    const useButtons = screen.getAllByText('use');
    await user.click(useButtons[0]);

    expect(screen.getByText('Applied')).toBeInTheDocument();

    vi.advanceTimersByTime(600);
    vi.useRealTimers();
  });

  // ─── Delete ─────────────────────────────────────────────────────

  it('should call deleteEntry when delete is confirmed', async () => {
    const { user } = render(
      <HistoryPanel onSelect={mockOnSelect} onClose={mockOnClose} language="en" />,
    );

    const deleteButtons = screen.getAllByLabelText(/delete/i);
    await user.click(deleteButtons[0]);
    await user.click(screen.getByTestId('confirm-btn'));

    expect(mockDeleteEntry).toHaveBeenCalledWith('e1');
  });

  it('should not delete when confirm is cancelled', async () => {
    const { user } = render(
      <HistoryPanel onSelect={mockOnSelect} onClose={mockOnClose} language="en" />,
    );

    const deleteButtons = screen.getAllByLabelText(/delete/i);
    await user.click(deleteButtons[0]);
    await user.click(screen.getByTestId('cancel-btn'));

    expect(mockDeleteEntry).not.toHaveBeenCalled();
  });

  // ─── Clear All ──────────────────────────────────────────────────

  it('should show clear all button in footer', () => {
    render(<HistoryPanel onSelect={mockOnSelect} onClose={mockOnClose} language="en" />);
    expect(screen.getByText('clear')).toBeInTheDocument();
  });

  it('should call clearHistory when clear all is confirmed', async () => {
    const { user } = render(
      <HistoryPanel onSelect={mockOnSelect} onClose={mockOnClose} language="en" />,
    );

    await user.click(screen.getByText('clear'));
    await user.click(screen.getByTestId('confirm-btn'));
    expect(mockClearHistory).toHaveBeenCalled();
  });

  it('should call rateEntry when a star is clicked', async () => {
    const { user } = render(
      <HistoryPanel onSelect={mockOnSelect} onClose={mockOnClose} language="en" />,
    );

    await user.click(screen.getAllByRole('button', { name: 'Rate 4 stars' })[0]);
    expect(mockRateEntry).toHaveBeenCalledWith('e1', 4);
  });

  // ─── Reset Filters ─────────────────────────────────────────────

  it('should show reset button when filters are active', async () => {
    const { user } = render(
      <HistoryPanel onSelect={mockOnSelect} onClose={mockOnClose} language="en" />,
    );

    await user.click(screen.getByText('sora'));

    // The reset button should appear
    expect(screen.getByTitle('Reset all filters')).toBeInTheDocument();
  });

  it('should reset all filters when reset button is clicked', async () => {
    const { user } = render(
      <HistoryPanel onSelect={mockOnSelect} onClose={mockOnClose} language="en" />,
    );

    // Set a filter
    await user.click(screen.getByText('sora'));
    expect(screen.queryByText('Sunset over ocean')).not.toBeInTheDocument();

    // Reset
    await user.click(screen.getByTitle('Reset all filters'));

    // All entries visible again
    expect(screen.getByText('Sunset over ocean')).toBeInTheDocument();
    expect(screen.getByText('Aerial city view')).toBeInTheDocument();
  });

  it('should clear filters button from no-matches empty state', async () => {
    const { user } = render(
      <HistoryPanel onSelect={mockOnSelect} onClose={mockOnClose} language="en" />,
    );

    // Type something that doesn't match
    await user.type(screen.getByPlaceholderText('searchPlaceholder'), 'zzzzz');
    expect(screen.getByText('No matches found')).toBeInTheDocument();

    // Click clear filters action
    const clearBtn = screen.getByText('Clear Filters');
    await user.click(clearBtn);

    // All entries visible again
    expect(screen.getByText('Sunset over ocean')).toBeInTheDocument();
  });
});
