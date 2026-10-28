import { useRenderJobsStore } from '@core/store/useRenderJobsStore';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Project } from '@core/types';
import type { TimelineRenderPlanV1 } from '@core/types/creatorDelivery';
import { useAppStore } from '@core/store/useAppStore';
import { useProjectStore } from '@core/store/useProjectStore';
import { useTimelineRecoveryStore } from '@core/store/useTimelineRecoveryStore';
import { useProductionRunStore } from '@core/store/useProductionRunStore';
import { defaultCreatorDelivery } from '@core/services/creatorDeliveryService';
import * as captionService from '@core/services/creatorCaptionService';
import { CreatorDeliveryPanel } from './CreatorDeliveryPanel';

const mock = vi.hoisted(() => ({
  load: vi.fn(),
  save: vi.fn(),
  settings: vi.fn(),
  plan: vi.fn(),
  batchPlans: vi.fn(),
  preflight: vi.fn().mockResolvedValue([]),
  start: vi.fn(),
  publish: vi.fn(),
  otioPreflight: vi.fn(),
}));
vi.mock('@core/services/projectTransferService', async (original) => {
  const actual = await original<typeof import('@core/services/projectTransferService')>();
  return { ...actual, preflightProjectOtioExport: mock.otioPreflight };
});
vi.mock('@core/services/projectDocumentService', () => ({
  setDocumentRegisterCallback: vi.fn(),
  projectDocumentService: { load: mock.load, save: mock.save },
}));
vi.mock('@core/services/projectSaveCoordinator', () => ({
  projectSaveCoordinator: {
    saveProject: vi.fn().mockResolvedValue(undefined),
    flushBeforeProjectChange: vi.fn().mockResolvedValue(undefined),
  },
}));
vi.mock('@core/services/creatorDeliveryService', async (original) => {
  const actual = await original<typeof import('@core/services/creatorDeliveryService')>();
  return {
    ...actual,
    creatorDeliveryService: {
      saveSettings: mock.settings,
      buildPlan: mock.plan,
      buildBatchPlans: mock.batchPlans,
      preflight: mock.preflight,
    },
  };
});
vi.mock('@core/services/creatorPublishingService', async (original) => {
  const actual = await original<typeof import('@core/services/creatorPublishingService')>();
  return {
    ...actual,
    creatorPublishingService: { propose: mock.publish },
  };
});
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
    useRenderJobsStore.setState({ jobs: [] });
    mock.preflight.mockResolvedValue([]);
    mock.otioPreflight.mockResolvedValue({ missingMedia: [] });
    useTimelineRecoveryStore.getState().setRecovery(null);
    useProductionRunStore.setState({ activeRun: null });
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
  it('keeps cancelled saves incomplete and remembers a confirmed save of a previous job', async () => {
    useRenderJobsStore.setState({
      jobs: [{ id: 'old', projectId: 'p', contentHash: 'old', status: 'complete', progress: 1 }],
    });
    const save = vi.fn().mockResolvedValueOnce({ saved: false }).mockResolvedValueOnce({
      saved: true,
      name: 'film.mp4',
    });
    Object.defineProperty(window, 'electron', {
      configurable: true,
      value: { saveTimelineRender: save },
    });
    const { unmount } = render(<CreatorDeliveryPanel />);
    const button = await screen.findByRole('button', { name: 'Save MP4' });
    expect(screen.getByText(/Previous delivery: it may not include/)).toBeInTheDocument();
    await userEvent.click(button);
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('Saved as:')).not.toBeInTheDocument();
    await userEvent.click(button);
    expect(await screen.findByText('film.mp4')).toBeInTheDocument();
    expect(screen.getByText(/file may have been moved or deleted/)).toBeInTheDocument();
    unmount();
    render(<CreatorDeliveryPanel />);
    expect(await screen.findByText('film.mp4')).toBeInTheDocument();
    expect(screen.getByText(/Previous delivery: it may not include/)).toBeInTheDocument();
  });
  it('counts a confirmed save for the current render and marks it previous after an edit', async () => {
    const renderJob = {
      id: 'current',
      projectId: 'p',
      contentHash: 'hash',
      purpose: 'delivery',
      status: 'complete',
      progress: 1,
    };
    mock.plan.mockResolvedValue({ contentHash: 'hash' });
    Object.defineProperty(window, 'electron', {
      configurable: true,
      value: {
        getTimelineRenderCapabilities: vi.fn().mockResolvedValue({ available: true }),
        startTimelineRender: vi.fn().mockResolvedValue(renderJob),
        getTimelineRenderJob: vi.fn().mockResolvedValue(renderJob),
        saveTimelineRender: vi.fn().mockResolvedValue({ saved: true, name: 'current.mp4' }),
      },
    });
    render(<CreatorDeliveryPanel />);
    const exportButton = await screen.findByRole('button', { name: 'Export video' });
    await waitFor(() => expect(exportButton).toBeEnabled());
    await userEvent.click(exportButton);
    const saveButton = await screen.findByRole('button', { name: 'Save MP4' });
    const nav = screen.getByRole('navigation', { name: 'Delivery steps' });
    expect(within(nav).getByText('Export video').parentElement).toHaveTextContent('✓');
    expect(within(nav).getByText('Save file').parentElement).not.toHaveTextContent('✓');
    await userEvent.click(saveButton);
    await waitFor(() =>
      expect(within(nav).getByText('Save file').parentElement).toHaveTextContent('✓'),
    );
    await userEvent.selectOptions(screen.getByLabelText('Resolution'), '720p');
    expect(within(nav).getByText('Export video').parentElement).not.toHaveTextContent('✓');
    expect(screen.getByText(/Previous delivery: it may not include/)).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Resolution'), '1080p');
    expect(within(nav).getByText('Save file').parentElement).toHaveTextContent('✓');
    act(() => useAppStore.getState().updateTimelineClip('c', { label: 'Changed' }));
    expect(within(nav).getByText('Export video').parentElement).not.toHaveTextContent('✓');
    expect(screen.getByText(/Previous delivery: it may not include/)).toBeInTheDocument();
  });
  it('does not start a render if the resolution changes while its plan is prepared', async () => {
    let resolvePlan!: (plan: TimelineRenderPlanV1) => void;
    mock.plan.mockReturnValueOnce(
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
    await userEvent.selectOptions(screen.getByLabelText('Resolution'), '720p');
    await act(async () => resolvePlan({ projectId: 'p' } as TimelineRenderPlanV1));
    expect(mock.start).not.toHaveBeenCalled();
  });
  it('focuses the affected caption from non-blocking review suggestions', async () => {
    useAppStore.setState((state) => ({
      clips: [
        ...state.clips,
        {
          id: 'caption-clip',
          resourceId: 'caption',
          trackId: 'v',
          label: 'Caption',
          startTime: 1,
          offset: 0,
          duration: 1,
          type: 'text',
          caption: {
            id: 'caption',
            text: 'a'.repeat(43),
            startTime: 1,
            endTime: 2,
            style: 'classic',
          },
        },
      ],
    }));
    render(<CreatorDeliveryPanel />);
    const review = await screen.findByRole('button', { name: /Review caption/ });
    expect(screen.getByText(/A line exceeds 42 characters/)).toBeInTheDocument();
    await userEvent.click(review);
    expect(document.getElementById('delivery-caption-caption-clip')).toHaveFocus();
    expect(useAppStore.getState().currentTime).toBe(1);
  });
  it('does not rerun caption analysis on playhead-only updates', async () => {
    const analyze = vi.spyOn(captionService, 'getCreatorCaptionReviewIssues');
    try {
      render(<CreatorDeliveryPanel />);
      await screen.findByRole('button', { name: 'Add caption' });
      analyze.mockClear();
      act(() => useAppStore.getState().setCurrentTime(0.5));
      expect(analyze).not.toHaveBeenCalled();
    } finally {
      analyze.mockRestore();
    }
  });
  it('publishes only verified, still-current missing-media recovery targets', async () => {
    const missingMedia = [{ mediaKey: 'media', clipId: 'c', clipLabel: 'Example' }];
    mock.preflight.mockResolvedValue([
      { code: 'media-missing', target: 'clip', clipId: 'c', message: 'Missing', action: 'Relink' },
    ]);
    mock.otioPreflight.mockResolvedValue({ missingMedia });
    render(<CreatorDeliveryPanel />);
    await userEvent.click(await screen.findByRole('button', { name: 'Check delivery' }));
    await waitFor(() =>
      expect(useTimelineRecoveryStore.getState().recovery?.missingMedia).toEqual(missingMedia),
    );

    let resolveCheck!: (value: { missingMedia: typeof missingMedia }) => void;
    mock.otioPreflight.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveCheck = resolve;
      }),
    );
    useTimelineRecoveryStore.getState().setRecovery(null);
    await userEvent.click(screen.getByRole('button', { name: /Check delivery/ }));
    await waitFor(() => expect(mock.otioPreflight).toHaveBeenCalledTimes(2));
    act(() => useAppStore.getState().updateTimelineClip('c', { label: 'Changed' }));
    await act(async () => resolveCheck({ missingMedia }));
    expect(useTimelineRecoveryStore.getState().recovery).toBeNull();
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

  it('supports selecting batch formats and triggers sequential batch export', async () => {
    mock.load.mockResolvedValue({
      ...project,
      creatorDelivery: {
        ...defaultCreatorDelivery(project),
        batchFormats: ['9:16', '16:9'],
      },
    });
    mock.settings.mockImplementation((_id: string, value: unknown) => Promise.resolve(value));
    const plan916 = {
      contentHash: 'hash-916',
      aspectRatio: '9:16' as const,
      durationSeconds: 5,
      clips: [],
      captions: [],
    };
    const plan169 = {
      contentHash: 'hash-169',
      aspectRatio: '16:9' as const,
      durationSeconds: 5,
      clips: [],
      captions: [],
    };
    mock.batchPlans.mockResolvedValue([plan916, plan169]);

    const start = vi
      .fn()
      .mockImplementation((plan: { contentHash: string; aspectRatio?: string }) =>
        Promise.resolve({
          id: `job-${plan.contentHash}`,
          projectId: 'p',
          contentHash: plan.contentHash,
          aspectRatio: plan.aspectRatio,
          status: 'complete',
          progress: 1,
        }),
      );
    const getJob = vi.fn().mockImplementation((id: string) =>
      Promise.resolve({
        id,
        projectId: 'p',
        contentHash: id,
        status: 'complete',
        progress: 1,
      }),
    );

    Object.defineProperty(window, 'electron', {
      configurable: true,
      value: {
        getTimelineRenderCapabilities: vi.fn().mockResolvedValue({ available: true }),
        inspectTimelineRenderCapabilities: vi.fn().mockResolvedValue({ available: true }),
        startTimelineRender: start,
        getTimelineRenderJob: getJob,
      },
    });

    render(<CreatorDeliveryPanel />);
    const batchButton = await screen.findByRole('button', { name: /Batch export/i });
    expect(batchButton).toBeInTheDocument();
    await waitFor(() => expect(batchButton).toBeEnabled());
    await userEvent.click(batchButton);

    await waitFor(() => expect(mock.batchPlans).toHaveBeenCalled());
    expect(start).toHaveBeenCalledTimes(2);
  });

  it('inserts zero-token chapter timestamps from timeline visual clips into description', async () => {
    render(<CreatorDeliveryPanel />);
    const description = await screen.findByLabelText('Description');
    await userEvent.type(description, 'A short coastal travel film.');
    const chaptersBtn = screen.getByRole('button', { name: 'Insert clip chapters (0 tokens)' });
    await userEvent.click(chaptersBtn);
    expect((description as HTMLTextAreaElement).value).toContain('A short coastal travel film.');
    expect((description as HTMLTextAreaElement).value).toContain('Chapters:\n00:00 Example');
  });
});
