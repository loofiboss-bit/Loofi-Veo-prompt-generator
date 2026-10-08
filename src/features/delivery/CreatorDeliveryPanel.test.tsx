import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Project } from '@core/types';
import type { TimelineRenderPlanV1 } from '@core/types/creatorDelivery';
import { useAppStore } from '@core/store/useAppStore';
import { useProjectStore } from '@core/store/useProjectStore';
import { CreatorDeliveryPanel } from './CreatorDeliveryPanel';

const mock = vi.hoisted(() => ({
  load: vi.fn(),
  save: vi.fn(),
  settings: vi.fn(),
  plan: vi.fn(),
  start: vi.fn(),
  publish: vi.fn(),
}));
vi.mock('@core/services/projectDocumentService', () => ({
  projectDocumentService: { load: mock.load, save: mock.save },
}));
vi.mock('@core/services/creatorDeliveryService', async (original) => {
  const actual = await original<typeof import('@core/services/creatorDeliveryService')>();
  return {
    ...actual,
    creatorDeliveryService: { saveSettings: mock.settings, buildPlan: mock.plan },
  };
});
vi.mock('@core/services/creatorPublishingService', () => ({
  creatorPublishingService: { propose: mock.publish },
}));
vi.mock('idb-keyval', () => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  keys: vi.fn().mockResolvedValue([]),
  clear: vi.fn(),
  createStore: vi.fn(),
  update: vi.fn(),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, fallback: string) => fallback }),
}));

const project = {
  id: 'p',
  name: 'Offline example',
  storyboard: { shots: [], timeline: { tracks: [], clips: [] } },
} as unknown as Project;
describe('CreatorDeliveryPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.getState().resetAll();
    useAppStore.setState({
      tracks: [{ id: 'v', type: 'video', label: 'Video', trackType: 'dialogue', zIndex: 0 }],
      clips: [
        {
          id: 'c',
          resourceId: 'media',
          trackId: 'v',
          label: 'Example',
          startTime: 0,
          offset: 0,
          duration: 3,
          type: 'video',
        },
      ],
    });
    useProjectStore.setState({ currentProjectId: 'p', projects: [] });
    mock.load.mockResolvedValue(project);
    mock.save.mockResolvedValue({ durable: true });
    mock.settings.mockImplementation((_id, settings) =>
      Promise.resolve({ ...settings, revision: 1 }),
    );
    Object.defineProperty(window, 'electron', { configurable: true, value: undefined });
  });
  it('explains desktop capability limits and leaves captions usable in a browser', async () => {
    render(<CreatorDeliveryPanel />);
    expect(await screen.findByText(/requires the desktop app/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export video' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Add caption' })).toBeEnabled();
    expect(screen.getByRole('combobox', { name: 'Output' })).toHaveValue('sidecar');
    expect(screen.getByRole('combobox', { name: 'Style' })).toHaveValue('classic');
  });
  it('does not submit a render after a project switch during plan preparation', async () => {
    let resolvePlan!: (plan: TimelineRenderPlanV1) => void;
    mock.plan.mockReturnValue(
      new Promise<TimelineRenderPlanV1>((resolve) => {
        resolvePlan = resolve;
      }),
    );
    Object.defineProperty(window, 'electron', {
      configurable: true,
      value: {
        getTimelineRenderCapabilities: vi.fn().mockResolvedValue({ available: true }),
        startTimelineRender: mock.start,
      },
    });
    render(<CreatorDeliveryPanel />);
    const button = await screen.findByRole('button', { name: 'Export video' });
    await waitFor(() => expect(button).toBeEnabled());
    await userEvent.click(button);
    await waitFor(() => expect(mock.plan).toHaveBeenCalled());
    act(() => useProjectStore.setState({ currentProjectId: 'new-project' }));
    await act(async () => resolvePlan({ projectId: 'p' } as TimelineRenderPlanV1));
    expect(mock.start).not.toHaveBeenCalled();
  });
  it('links native media failures back to the affected timeline clip', async () => {
    mock.plan.mockResolvedValue({ projectId: 'p' });
    mock.start.mockResolvedValue({
      id: 'job',
      projectId: 'p',
      status: 'failed',
      progress: 0,
      error: 'Cannot read media for clip c. Unsupported or damaged file.',
    });
    Object.defineProperty(window, 'electron', {
      configurable: true,
      value: {
        getTimelineRenderCapabilities: vi.fn().mockResolvedValue({ available: true }),
        startTimelineRender: mock.start,
      },
    });
    render(<CreatorDeliveryPanel />);
    const button = await screen.findByRole('button', { name: 'Export video' });
    await waitFor(() => expect(button).toBeEnabled());
    await userEvent.click(button);
    expect(await screen.findByRole('button', { name: 'Locate affected clip' })).toBeEnabled();
  });
  it('keeps edited publication text when an older AI proposal completes', async () => {
    let resolvePublish!: (value: { title: string; description: string }) => void;
    mock.publish.mockReturnValue(
      new Promise((resolve) => {
        resolvePublish = resolve;
      }),
    );
    Object.defineProperty(window, 'electron', {
      configurable: true,
      value: { approveProviderCost: vi.fn() },
    });
    render(<CreatorDeliveryPanel />);
    const title = await screen.findByLabelText('Publication title');
    const description = screen.getByLabelText('Description');
    await userEvent.type(description, 'An honest local example.');
    await userEvent.click(
      screen.getByRole('button', { name: 'Request publication text proposal' }),
    );
    await waitFor(() => expect(mock.publish).toHaveBeenCalled());
    await userEvent.clear(title);
    await userEvent.type(title, 'My newer title');
    await act(async () =>
      resolvePublish({ title: 'Old AI title', description: 'Old AI description' }),
    );
    expect(title).toHaveValue('My newer title');
    expect(
      screen.queryByRole('button', { name: 'Accept publication text' }),
    ).not.toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Publication text or project changed',
    );
  });
});
