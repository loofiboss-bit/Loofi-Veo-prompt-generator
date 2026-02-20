import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '../../test-utils';

vi.mock('@core/store/useBatchPromptStore', () => {
  const store = {
    isOpen: true,
    isLoading: false,
    templates: [
      { id: 'tpl-1', name: 'Cinematic Scene' },
      { id: 'tpl-2', name: 'Product Showcase' },
    ],
    selectedTemplateId: null,
    variableNames: [],
    variableMatrix: [{}],
    overrides: {},
    activeJobId: null,
    lastResult: null,
    open: vi.fn(),
    close: vi.fn(),
    selectTemplate: vi.fn(),
    updateVariable: vi.fn(),
    addRow: vi.fn(),
    removeRow: vi.fn(),
    setOverrides: vi.fn(),
    startBatch: vi.fn(),
    setLastResult: vi.fn(),
    reset: vi.fn(),
  };
  return { useBatchPromptStore: () => store, __mockStore: store };
});

const mockJobs = vi.fn<() => { jobs: Array<Record<string, unknown>> }>(() => ({ jobs: [] }));
vi.mock('@core/store/useJobQueueStore', () => ({
  useJobQueueStore: () => mockJobs(),
}));

vi.mock('@core/services/loggerService', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { BatchGeneratorModal } from './BatchGeneratorModal';
import { useBatchPromptStore } from '@core/store/useBatchPromptStore';

function renderModal(overrides: Record<string, unknown> = {}) {
  // Access mock store via the hoisted mock — safe in test context
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const store = useBatchPromptStore() as unknown as Record<string, unknown>;
  Object.assign(store, overrides);
  const props = {
    isOpen: true,
    onClose: vi.fn(),
    addToast: vi.fn(),
  };
  const result = render(<BatchGeneratorModal {...props} />);
  return { ...result, ...props };
}

describe('BatchGeneratorModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Dialog semantics ──────────────────────────────────────────────

  it('renders a dialog with proper ARIA attributes', () => {
    renderModal();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'batch-generator-title');
  });

  it('has accessible title connected via aria-labelledby', () => {
    renderModal();
    const title = screen.getByText('Batch Prompt Generator');
    expect(title).toHaveAttribute('id', 'batch-generator-title');
  });

  it('provides an accessible close button', () => {
    renderModal();
    const closeBtn = screen.getByRole('button', { name: /close/i });
    expect(closeBtn).toBeInTheDocument();
  });

  // ── Template selection ────────────────────────────────────────────

  it('associates the template label with the select element', () => {
    renderModal();
    const select = screen.getByLabelText(/select prompt template/i);
    expect(select).toBeInTheDocument();
    expect(select.tagName).toBe('SELECT');
  });

  it('renders template options inside the select', () => {
    renderModal();
    const select = screen.getByLabelText(/select prompt template/i);
    const options = within(select).getAllByRole('option');
    expect(options).toHaveLength(3);
    expect(options[0]).toHaveTextContent('Choose a template...');
    expect(options[1]).toHaveTextContent('Cinematic Scene');
    expect(options[2]).toHaveTextContent('Product Showcase');
  });

  it('shows empty state when no templates exist', () => {
    renderModal({ templates: [] });
    expect(screen.getByText(/no templates found/i)).toBeInTheDocument();
  });

  it('shows loading indicator while templates are loading', () => {
    renderModal({ isLoading: true, templates: [] });
    expect(screen.getByText(/loading templates/i)).toBeInTheDocument();
  });

  // ── Variable matrix ───────────────────────────────────────────────

  it('renders variable matrix with accessible table and input labels', () => {
    renderModal({
      selectedTemplateId: 'tpl-1',
      variableNames: ['CHARACTER', 'LOCATION'],
      variableMatrix: [{ CHARACTER: '', LOCATION: '' }],
    });

    const table = screen.getByRole('table', { name: /batch variable matrix/i });
    expect(table).toBeInTheDocument();

    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(2);
    expect(inputs[0]).toHaveAttribute('aria-label', 'Row 1, variable CHARACTER');
    expect(inputs[1]).toHaveAttribute('aria-label', 'Row 1, variable LOCATION');
  });

  it('provides accessible remove-row buttons', () => {
    renderModal({
      selectedTemplateId: 'tpl-1',
      variableNames: ['STYLE'],
      variableMatrix: [{ STYLE: 'a' }, { STYLE: 'b' }],
    });

    const removeButtons = screen.getAllByRole('button', { name: /remove row/i });
    expect(removeButtons).toHaveLength(2);
    expect(removeButtons[0]).toHaveAttribute('aria-label', 'Remove row 1');
    expect(removeButtons[1]).toHaveAttribute('aria-label', 'Remove row 2');
  });

  it('shows no-variables empty state when template has no placeholders', () => {
    renderModal({
      selectedTemplateId: 'tpl-1',
      variableNames: [],
      variableMatrix: [{}],
    });
    expect(screen.getByText(/no variables detected/i)).toBeInTheDocument();
  });

  // ── Action buttons ────────────────────────────────────────────────

  it('disables generate button when no template is selected', () => {
    renderModal({ selectedTemplateId: null });
    const genBtn = screen.getByRole('button', { name: /generate batch/i });
    expect(genBtn).toBeDisabled();
  });

  it('enables generate button when a template is selected', () => {
    renderModal({ selectedTemplateId: 'tpl-1' });
    const genBtn = screen.getByRole('button', { name: /generate batch/i });
    expect(genBtn).toBeEnabled();
  });

  // ── Progress semantics ────────────────────────────────────────────

  it('renders progress bar with aria-live region during generation', () => {
    mockJobs.mockReturnValue({
      jobs: [{ id: 'job-1', status: 'processing', progress: 42 }],
    });

    renderModal({ activeJobId: 'job-1' });

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-label', 'Batch generation progress');
    expect(progressBar).toHaveAttribute('value', '42');

    const liveRegion = progressBar.closest('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
  });

  // ── Results summary ───────────────────────────────────────────────

  it('renders results summary with stats after batch completes', () => {
    renderModal({
      lastResult: {
        templateName: 'Cinematic Scene',
        totalCount: 5,
        successCount: 4,
        failedCount: 1,
        durationMs: 3200,
        results: [],
      },
    });

    expect(screen.getByText('Batch Results — Cinematic Scene')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Completed in 3.2s')).toBeInTheDocument();
  });

  // ── Keyboard interaction ──────────────────────────────────────────

  it('does not render when isOpen is false', () => {
    const props = { isOpen: false, onClose: vi.fn(), addToast: vi.fn() };
    const { container } = render(<BatchGeneratorModal {...props} />);
    expect(container.innerHTML).toBe('');
  });
});
