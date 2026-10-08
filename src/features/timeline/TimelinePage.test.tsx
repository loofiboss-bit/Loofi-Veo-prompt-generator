import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { render, screen, waitFor } from '@/test-utils';
import { ROUTES } from '@core/config/routes';
import { useAppStore } from '@core/store/useAppStore';

import TimelinePage from './TimelinePage';
import { useProjectStore } from '@core/store/useProjectStore';
import { useProductionRunStore } from '@core/store/useProductionRunStore';
import type { Project } from '@core/types';

const delivery = vi.hoisted(() => ({
  save: vi.fn(),
  load: vi.fn(),
  preflight: vi.fn(),
  export: vi.fn(),
  download: vi.fn(),
}));
vi.mock('@core/services/projectDocumentService', () => ({
  projectDocumentService: { save: delivery.save, load: delivery.load },
}));
vi.mock('@core/services/projectTransferService', () => ({
  preflightProjectOtioExport: delivery.preflight,
  exportProjectOtioBundle: delivery.export,
  downloadProjectBlob: delivery.download,
}));

const mockNavigate = vi.fn();
let mockLocationState: { returnToStudio?: 'story' } | null = null;

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({
      pathname: '/timeline',
      search: '',
      hash: '',
      key: 'timeline-test',
      state: mockLocationState,
    }),
  };
});

vi.mock('idb-keyval', () => ({
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
  keys: vi.fn().mockResolvedValue([]),
  clear: vi.fn().mockResolvedValue(undefined),
  createStore: vi.fn(),
  update: vi.fn(),
}));

vi.mock('./TimelinePlayer', () => ({
  default: ({ shots, onClose }: { shots: Array<{ id: number }>; onClose: () => void }) => (
    <div>
      <div data-testid="timeline-player">Timeline player shots: {shots.length}</div>
      <button onClick={onClose}>Close timeline</button>
    </div>
  ),
}));

describe('TimelinePage', () => {
  beforeEach(() => {
    useAppStore.getState().resetAll();
    mockNavigate.mockReset();
    mockLocationState = null;
    useProjectStore.setState({ currentProjectId: 'external-project', projects: [] });
    useProductionRunStore.setState({ activeRun: null });
    delivery.save.mockReset().mockResolvedValue({ durable: true });
    delivery.load.mockReset().mockResolvedValue({
      id: 'external-project',
      name: 'External',
      studioResults: [{ id: 'external-result' }],
    });
    delivery.preflight.mockReset().mockResolvedValue({ missingMedia: [] });
    delivery.export.mockReset().mockResolvedValue(new Blob(['delivery']));
    delivery.download.mockReset();
  });

  it('shows an empty state when there are no generated video clips', () => {
    render(<TimelinePage />);

    expect(
      screen.getByRole('status', {
        name: /your timeline is empty/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to prompt studio/i })).toBeInTheDocument();
  });

  it('returns to storyboard from the empty state when timeline was opened there', async () => {
    mockLocationState = { returnToStudio: 'story' };
    const { user } = render(<TimelinePage />);

    await user.click(screen.getByRole('button', { name: /back to story ?board/i }));

    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.HOME, {
      state: { reopenStudio: 'story' },
    });
  });

  it('renders the timeline player when a generated video clip exists', () => {
    useAppStore.setState({
      sbShots: [
        {
          id: 1,
          type: 'video',
          action: 'Reveal city skyline',
          camera: 'Wide shot',
          characterId: '',
          takes: [],
          selectedTakeIndex: 0,
          visualLink: false,
          duration: 5,
          transition: { type: 'cut', duration: 0 },
          generatedVideoUrl: 'https://example.com/shot.mp4',
        },
      ],
    });

    render(<TimelinePage />);

    expect(screen.getByTestId('timeline-player')).toHaveTextContent('Timeline player shots: 1');
  });

  it('returns to storyboard when closing the timeline after arriving from storyboard', async () => {
    mockLocationState = { returnToStudio: 'story' };
    useAppStore.setState({
      sbShots: [
        {
          id: 1,
          type: 'video',
          action: 'Reveal city skyline',
          camera: 'Wide shot',
          characterId: '',
          takes: [],
          selectedTakeIndex: 0,
          visualLink: false,
          duration: 5,
          transition: { type: 'cut', duration: 0 },
          generatedVideoUrl: 'https://example.com/shot.mp4',
        },
      ],
    });

    const { user } = render(<TimelinePage />);

    await user.click(screen.getByRole('button', { name: /close timeline/i }));

    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.HOME, {
      state: { reopenStudio: 'story' },
    });
  });
  it('exports an external-only project without creating a production run', async () => {
    useAppStore.setState({
      sbShots: [{ id: 1, generatedVideoUrl: 'blob:imported' }] as Project['storyboard']['shots'],
    });
    const { user } = render(<TimelinePage />);
    await user.click(screen.getByRole('button', { name: /download otio with media/i }));
    await waitFor(() => expect(delivery.download).toHaveBeenCalledOnce());
    expect(delivery.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'external-project' }));
    expect(delivery.export).toHaveBeenCalledWith(
      expect.objectContaining({ studioResults: [{ id: 'external-result' }] }),
      null,
    );
  });

  it('shows missing selected media and relinks the actual edit to a compatible local asset', async () => {
    useAppStore.setState({
      sbShots: [{ id: 1, generatedVideoUrl: 'blob:imported' }] as Project['storyboard']['shots'],
      assets: [
        { id: 'replacement', type: 'video', name: 'Replacement clip' },
      ] as import('@core/types').Asset[],
      clips: [
        {
          id: 'opening',
          trackId: 'v',
          type: 'video',
          resourceId: 'gone',
          label: 'Opening',
          startTime: 0,
          duration: 2,
          offset: 0,
        },
      ],
    });
    delivery.preflight.mockResolvedValueOnce({
      missingMedia: [{ clipId: 'opening', clipLabel: 'Opening', mediaKey: 'gone' }],
    });
    const { user } = render(<TimelinePage />);
    await user.click(screen.getByRole('button', { name: /download otio with media/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Opening (gone)');
    expect(delivery.download).not.toHaveBeenCalled();
    await user.selectOptions(screen.getByRole('combobox'), 'replacement');
    await user.click(screen.getByRole('button', { name: /relink clip/i }));
    await waitFor(() => expect(useAppStore.getState().clips[0].resourceId).toBe('replacement'));
    expect(useAppStore.getState().clips[0].selectedTakeId).toBeUndefined();
  });
});
