import { beforeEach, describe, expect, it, vi } from 'vitest';

import { render, screen, waitFor } from '@/test-utils';

import { ActivityPage } from './ActivityPage';

const { cancel, list, onUpdate, retry, subscribe, unsubscribe } = vi.hoisted(() => ({
  cancel: vi.fn().mockResolvedValue(true),
  list: vi.fn(),
  onUpdate: { current: undefined as undefined | ((job: Record<string, unknown>) => void) },
  retry: vi.fn().mockResolvedValue(true),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
}));

vi.mock('@core/services/paidJobService', () => ({
  paidJobService: { cancel, list, retry, subscribe },
}));

vi.mock('@core/store/useGenerationQueueStore', () => ({
  useGenerationQueueStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      items: [
        {
          id: 'queue-1',
          type: 'video',
          label: 'Local queued shot',
          status: 'waiting-online',
          priority: 0,
          progress: 0,
          payload: {},
          retryCount: 0,
          queuedOffline: true,
          createdAt: 1,
        },
      ],
      activeCount: 0,
      pendingCount: 1,
      cancel: vi.fn(),
      retry: vi.fn(),
    }),
}));

describe('ActivityPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    onUpdate.current = undefined;
    subscribe.mockImplementation((callback) => {
      onUpdate.current = callback;
      return unsubscribe;
    });
    list.mockResolvedValue([
      {
        id: 'music-1',
        jobKind: 'music',
        status: 'Error',
        prompt: 'Durable soundtrack',
        request: {
          modelId: 'lyria-3-clip-preview',
          prompt: 'Durable soundtrack',
          responseFormat: 'mp3',
          images: [],
        },
        costApproval: {
          approvalId: 'approval-1',
          modelId: 'lyria-3-clip-preview',
          maximumChargeUsd: 0.04,
          currency: 'USD',
          confidence: 'exact',
          sourceUrl: 'https://ai.google.dev/gemini-api/docs/pricing',
          verifiedDate: '2026-08-01',
          approvedAt: 1,
        },
        error: 'Offline',
        timestamp: 2,
      },
    ]);
  });

  it('hydrates local queue and durable provider jobs, then exposes recovery controls', async () => {
    const { user } = render(<ActivityPage />);

    expect(screen.getByText('Local queued shot')).toBeVisible();
    expect(await screen.findByText('Durable soundtrack')).toBeVisible();
    expect(screen.getByText('Offline')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(retry).toHaveBeenCalledWith('music-1'));
    expect(list).toHaveBeenCalledTimes(2);
  });

  it('merges main-process updates and unsubscribes when the page closes', async () => {
    const { unmount } = render(<ActivityPage />);
    await screen.findByText('Durable soundtrack');

    onUpdate.current?.({
      id: 'video-1',
      status: 'Polling',
      videoUrl: null,
      prompt: 'Recovered video',
      settings: {},
      timestamp: 3,
    });

    expect(await screen.findByText('Recovered video')).toBeVisible();
    unmount();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});
