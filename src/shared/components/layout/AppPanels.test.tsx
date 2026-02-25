import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppPanels } from './AppPanels';

vi.mock('@features/batch', () => ({
  BatchGeneratorModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="batch-modal">
      Batch Modal
      <button onClick={onClose}>Close Batch</button>
    </div>
  ),
}));

vi.mock('@features/jobs', () => ({
  JobsPanel: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="jobs-panel">
      Jobs Panel
      <button onClick={onClose}>Close Jobs</button>
    </div>
  ),
}));

vi.mock('@features/workspace', () => ({
  WorkspaceManagerModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="workspace-modal">
      Workspace Modal
      <button onClick={onClose}>Close Workspace</button>
    </div>
  ),
}));

vi.mock('@shared/components/resilience', () => ({
  QueuePanel: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="queue-panel">
      Queue Panel
      <button onClick={onClose}>Close Queue</button>
    </div>
  ),
}));

vi.mock('@shared/components/resilience/FallbackToast', () => ({
  FallbackToast: ({
    primaryModel,
    fallbackModel,
    onDismiss,
  }: {
    primaryModel: string;
    fallbackModel: string;
    onDismiss: () => void;
  }) => (
    <div data-testid="fallback-toast">
      {primaryModel} → {fallbackModel}
      <button onClick={onDismiss}>Dismiss Fallback</button>
    </div>
  ),
}));

function renderPanels(overrides: Partial<React.ComponentProps<typeof AppPanels>> = {}) {
  const props: React.ComponentProps<typeof AppPanels> = {
    isBatchModalOpen: false,
    onCloseBatchModal: vi.fn(),
    addToast: vi.fn(),
    isJobsPanelOpen: false,
    onCloseJobsPanel: vi.fn(),
    isWorkspaceManagerOpen: false,
    onCloseWorkspaceManager: vi.fn(),
    isQueuePanelOpen: false,
    onCloseQueuePanel: vi.fn(),
    fallbackNotification: null,
    onDismissFallback: vi.fn(),
    ...overrides,
  };

  render(<AppPanels {...props} />);
  return props;
}

describe('AppPanels', () => {
  it('renders no optional panels by default', () => {
    renderPanels();

    expect(screen.queryByTestId('batch-modal')).not.toBeInTheDocument();
    expect(screen.queryByTestId('jobs-panel')).not.toBeInTheDocument();
    expect(screen.queryByTestId('workspace-modal')).not.toBeInTheDocument();
    expect(screen.queryByTestId('queue-panel')).not.toBeInTheDocument();
    expect(screen.queryByTestId('fallback-toast')).not.toBeInTheDocument();
  });

  it('renders all conditional panels and fallback toast when enabled', async () => {
    renderPanels({
      isBatchModalOpen: true,
      isJobsPanelOpen: true,
      isWorkspaceManagerOpen: true,
      isQueuePanelOpen: true,
      fallbackNotification: {
        primaryModel: 'Model A',
        fallbackModel: 'Model B',
      },
    });

    expect(await screen.findByTestId('batch-modal')).toBeInTheDocument();
    expect(await screen.findByTestId('jobs-panel')).toBeInTheDocument();
    expect(await screen.findByTestId('workspace-modal')).toBeInTheDocument();
    expect(await screen.findByTestId('queue-panel')).toBeInTheDocument();
    expect(screen.getByTestId('fallback-toast')).toHaveTextContent('Model A → Model B');
  });

  it('calls close and dismiss handlers from panel actions', async () => {
    const user = userEvent.setup();
    const props = renderPanels({
      isBatchModalOpen: true,
      isJobsPanelOpen: true,
      isWorkspaceManagerOpen: true,
      isQueuePanelOpen: true,
      fallbackNotification: {
        primaryModel: 'Primary',
        fallbackModel: 'Fallback',
      },
    });

    await user.click(await screen.findByText('Close Batch'));
    await user.click(await screen.findByText('Close Jobs'));
    await user.click(await screen.findByText('Close Workspace'));
    await user.click(await screen.findByText('Close Queue'));
    await user.click(screen.getByText('Dismiss Fallback'));

    expect(props.onCloseBatchModal).toHaveBeenCalledTimes(1);
    expect(props.onCloseJobsPanel).toHaveBeenCalledTimes(1);
    expect(props.onCloseWorkspaceManager).toHaveBeenCalledTimes(1);
    expect(props.onCloseQueuePanel).toHaveBeenCalledTimes(1);
    expect(props.onDismissFallback).toHaveBeenCalledTimes(1);
  });
});
