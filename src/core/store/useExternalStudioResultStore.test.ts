import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExternalStudioResultV1 } from '@core/types/externalStudioResult';
import { storeMediator } from './mediator';
import { useExternalStudioResultStore } from './useExternalStudioResultStore';
const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  resolveAsset: vi.fn(),
  importVideo: vi.fn(),
  confirm: vi.fn(),
  accept: vi.fn(),
}));
vi.mock('@core/services/externalStudioResultService', () => ({
  externalStudioResultService: mocks,
}));
beforeEach(() => {
  vi.clearAllMocks();
  storeMediator.clear();
  mocks.list.mockResolvedValue([]);
  mocks.resolveAsset.mockResolvedValue(null);
  useExternalStudioResultStore.setState({
    projectId: null,
    results: [],
    assets: {},
    pending: false,
    error: null,
  });
});
describe('useExternalStudioResultStore', () => {
  it('ignores stale project hydration and never registers foreign assets', async () => {
    let release: (value: ExternalStudioResultV1[]) => void = () => {};
    mocks.list.mockImplementationOnce(
      () =>
        new Promise<ExternalStudioResultV1[]>((resolve) => {
          release = resolve;
        }),
    );
    const emitSpy = vi.spyOn(storeMediator, 'emit');
    const pending = useExternalStudioResultStore.getState().hydrate('p1');
    await useExternalStudioResultStore.getState().hydrate('p2');
    release([{ id: 'old', projectId: 'p1', assetId: 'a' } as ExternalStudioResultV1]);
    await pending;
    expect(useExternalStudioResultStore.getState()).toMatchObject({
      projectId: 'p2',
      results: [],
      pending: false,
    });
    expect(emitSpy).not.toHaveBeenCalledWith(
      'studioResult:assetsSynchronized',
      expect.objectContaining({ projectId: 'p1' }),
    );
  });
  it('blocks duplicate mutations while retaining actionable errors', async () => {
    await useExternalStudioResultStore.getState().hydrate('p1');
    let reject: (reason: Error) => void = () => {};
    mocks.confirm.mockImplementationOnce(
      () =>
        new Promise((_resolve, onReject) => {
          reject = onReject;
        }),
    );
    const pending = useExternalStudioResultStore.getState().confirm('r1', 'watched');
    await useExternalStudioResultStore.getState().confirm('r1', 'duplicate');
    expect(mocks.confirm).toHaveBeenCalledOnce();
    reject(new Error('Disk full'));
    await pending;
    expect(useExternalStudioResultStore.getState()).toMatchObject({
      pending: false,
      error: 'Disk full',
    });
  });

  it('emits asset:upserted via storeMediator when hydrating active project results', async () => {
    const assetHandler = vi.fn();
    const unsub = storeMediator.on('asset:upserted', assetHandler);

    const mockResult = {
      id: 'res-1',
      projectId: 'p1',
      assetId: 'asset-1',
      assetName: 'Render Take 1',
      mimeType: 'video/mp4',
    } as ExternalStudioResultV1;

    mocks.list.mockResolvedValueOnce([mockResult]);
    mocks.resolveAsset.mockResolvedValueOnce(null); // triggers fallback asset creation

    await useExternalStudioResultStore.getState().hydrate('p1');

    expect(assetHandler).toHaveBeenCalledOnce();
    expect(assetHandler).toHaveBeenCalledWith({
      asset: expect.objectContaining({
        id: 'asset-1',
        storageKey: 'asset-1',
        groupId: 'p1',
        name: 'Render Take 1',
        type: 'video',
      }),
    });

    unsub();
  });

  it('emits timeline:synced via storeMediator when accepting a result', async () => {
    const timelineHandler = vi.fn();
    const unsub = storeMediator.on('timeline:synced', timelineHandler);

    await useExternalStudioResultStore.getState().hydrate('p1');

    const acceptedProject = {
      storyboard: {
        shots: [{ id: 1, action: 'Updated Shot' }],
        timeline: {
          tracks: [{ id: 'video_main', label: 'Video' }],
          clips: [{ id: 'clip-1', trackId: 'video_main' }],
        },
      },
    };

    mocks.accept.mockImplementationOnce(
      async (
        _projId: string,
        _resId: string,
        _shotId: number | undefined,
        _isCurrent: () => boolean,
      ) => {
        return acceptedProject;
      },
    );

    await useExternalStudioResultStore.getState().accept('res-1', 1);

    expect(timelineHandler).toHaveBeenCalledOnce();
    expect(timelineHandler).toHaveBeenCalledWith({
      shots: acceptedProject.storyboard.shots,
      tracks: acceptedProject.storyboard.timeline.tracks,
      clips: acceptedProject.storyboard.timeline.clips,
    });

    unsub();
  });
});
