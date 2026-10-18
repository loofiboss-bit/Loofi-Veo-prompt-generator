import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExternalStudioResultV1 } from '@core/types/externalStudioResult';
import { useExternalStudioResultStore } from './useExternalStudioResultStore';
const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  resolveAsset: vi.fn(),
  importVideo: vi.fn(),
  confirm: vi.fn(),
  accept: vi.fn(),
  emit: vi.fn(),
}));
vi.mock('@core/services/externalStudioResultService', () => ({
  externalStudioResultService: mocks,
}));
vi.mock('@core/store/mediator', () => ({
  storeMediator: { emit: mocks.emit },
}));
beforeEach(() => {
  vi.clearAllMocks();
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
    const pending = useExternalStudioResultStore.getState().hydrate('p1');
    await useExternalStudioResultStore.getState().hydrate('p2');
    release([{ id: 'old', projectId: 'p1', assetId: 'a' } as ExternalStudioResultV1]);
    await pending;
    expect(useExternalStudioResultStore.getState()).toMatchObject({
      projectId: 'p2',
      results: [],
      pending: false,
    });
    expect(mocks.emit).not.toHaveBeenCalledWith(
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
});
