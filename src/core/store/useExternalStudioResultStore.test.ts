import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExternalStudioResultV1 } from '@core/types/externalStudioResult';
import { useExternalStudioResultStore } from './useExternalStudioResultStore';
const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  resolveAsset: vi.fn(),
  importVideo: vi.fn(),
  confirm: vi.fn(),
  accept: vi.fn(),
  current: { currentProjectId: 'p1' },
  app: { assets: [], addAsset: vi.fn(), updateAsset: vi.fn() },
  setApp: vi.fn(),
}));
vi.mock('@core/services/externalStudioResultService', () => ({
  externalStudioResultService: mocks,
}));
vi.mock('@core/store/useProjectStore', () => ({
  useProjectStore: { getState: () => mocks.current },
}));
vi.mock('@core/store/useAppStore', () => ({
  useAppStore: { getState: () => mocks.app, setState: mocks.setApp },
}));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.list.mockResolvedValue([]);
  mocks.resolveAsset.mockResolvedValue(null);
  mocks.current.currentProjectId = 'p1';
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
    mocks.current.currentProjectId = 'p2';
    await useExternalStudioResultStore.getState().hydrate('p2');
    release([{ id: 'old', projectId: 'p1', assetId: 'a' } as ExternalStudioResultV1]);
    await pending;
    expect(useExternalStudioResultStore.getState()).toMatchObject({
      projectId: 'p2',
      results: [],
      pending: false,
    });
    expect(mocks.app.addAsset).not.toHaveBeenCalled();
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
