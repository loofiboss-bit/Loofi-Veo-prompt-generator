import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockGet, mockSet, mockDel, mockUpdate, mockCreateStore, mockLoggerError, mockRecords } =
  vi.hoisted(() => ({
    mockRecords: new Map<string, unknown>(),
    mockGet: vi.fn(),
    mockSet: vi.fn(),
    mockDel: vi.fn(),
    mockUpdate: vi.fn(),
    mockCreateStore: vi.fn().mockReturnValue('mock-store'),
    mockLoggerError: vi.fn(),
  }));

vi.mock('idb-keyval', () => ({
  createStore: (...args: unknown[]) => mockCreateStore(...args),
  get: (...args: unknown[]) => mockGet(...args),
  set: (...args: unknown[]) => mockSet(...args),
  del: (...args: unknown[]) => mockDel(...args),
  update: (...args: unknown[]) => mockUpdate(...args),
}));

vi.mock('@core/services/loggerService', () => ({
  logger: { error: mockLoggerError, info: vi.fn(), debug: vi.fn() },
}));

import { idbStorage } from './storage';

describe('idbStorage', () => {
  const originalIndexedDb = globalThis.indexedDB;
  const availableIndexedDb = originalIndexedDb ?? ({} as IDBFactory);

  beforeEach(() => {
    vi.clearAllMocks();
    mockRecords.clear();
    vi.useRealTimers();
    mockGet.mockResolvedValue(undefined);
    mockSet.mockResolvedValue(undefined);
    mockDel.mockResolvedValue(undefined);
    mockGet.mockImplementation(async (key: string) => mockRecords.get(String(key)));
    mockSet.mockImplementation(async (key: string, value: unknown) => {
      mockRecords.set(String(key), value);
    });
    mockDel.mockImplementation(async (key: string) => {
      mockRecords.delete(String(key));
    });
    mockUpdate.mockImplementation(async (key: string, updater: (current: unknown) => unknown) => {
      mockRecords.set(String(key), updater(mockRecords.get(String(key))));
    });
    Object.defineProperty(globalThis, 'indexedDB', {
      configurable: true,
      value: availableIndexedDb,
      writable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(globalThis, 'indexedDB', {
      configurable: true,
      value: originalIndexedDb,
      writable: true,
    });
  });

  // ─── getItem ────────────────────────────────────────────────────

  it('should return null when no value is stored', async () => {
    mockGet.mockResolvedValue(undefined);

    const result = await idbStorage.getItem('test-key');

    expect(result).toBeNull();
  });

  it('should rehydrate and return stored value', async () => {
    const storedState = JSON.stringify({ promptState: { idea: 'Test' } });
    mockGet.mockResolvedValue(storedState);

    const result = await idbStorage.getItem('test-key');

    expect(result).not.toBeNull();
    const parsed = JSON.parse(result!);
    expect(parsed.promptState.idea).toBe('Test');
  });

  it('should rehydrate uploaded image from asset store', async () => {
    const storedState = JSON.stringify({
      promptState: { uploadedImage: { data: 'STORED_IN_IDB', mimeType: 'image/png' } },
    });

    mockGet.mockResolvedValueOnce(storedState).mockResolvedValueOnce('base64imagedata');

    const result = await idbStorage.getItem('test-key');

    expect(result).not.toBeNull();
    const parsed = JSON.parse(result!);
    expect(parsed.promptState.uploadedImage.data).toBe('base64imagedata');
  });

  it('should set uploaded image to null when asset not found', async () => {
    const storedState = JSON.stringify({
      promptState: { uploadedImage: { data: 'STORED_IN_IDB', mimeType: 'image/png' } },
    });

    mockGet.mockResolvedValueOnce(storedState).mockResolvedValueOnce(undefined);

    const result = await idbStorage.getItem('test-key');

    const parsed = JSON.parse(result!);
    expect(parsed.promptState.uploadedImage).toBeNull();
  });

  it('should rehydrate uploaded audio from asset store', async () => {
    const storedState = JSON.stringify({
      promptState: {
        uploadedAudio: { data: 'STORED_IN_IDB', mimeType: 'audio/wav', name: 'test.wav' },
      },
    });

    mockGet.mockResolvedValueOnce(storedState).mockResolvedValueOnce('base64audiodata');

    const result = await idbStorage.getItem('test-key');

    const parsed = JSON.parse(result!);
    expect(parsed.promptState.uploadedAudio.data).toBe('base64audiodata');
  });

  it('should rehydrate assets array from asset store', async () => {
    const storedState = JSON.stringify({
      assets: [
        { id: 'asset-1', data: '', name: 'photo.png' },
        { id: 'asset-2', data: 'inline-data', name: 'icon.svg' },
      ],
    });

    mockGet.mockResolvedValueOnce(storedState).mockResolvedValueOnce('restored-asset-data');

    const result = await idbStorage.getItem('test-key');

    const parsed = JSON.parse(result!);
    expect(parsed.assets[0].data).toBe('restored-asset-data');
    expect(parsed.assets[1].data).toBe('inline-data');
  });

  it('keeps registered desktop media without reading the legacy asset store', async () => {
    const asset = {
      id: 'local-media:123',
      storageKey: 'local-media:123',
      data: '',
      url: 'loofi-media://media/local-media%3A123',
    };
    mockGet.mockResolvedValueOnce(JSON.stringify({ assets: [asset] }));

    const result = await idbStorage.getItem('test-key');

    expect(JSON.parse(result!).assets).toEqual([asset]);
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it('rehydrates the Zustand state/version envelope without losing its version', async () => {
    const storedState = JSON.stringify({
      state: {
        assets: [{ id: 'asset-envelope', data: '' }],
        promptState: { uploadedImage: { data: 'STORED_IN_IDB', mimeType: 'image/png' } },
      },
      version: 8,
    });
    mockGet
      .mockResolvedValueOnce(storedState)
      .mockResolvedValueOnce('asset-data')
      .mockResolvedValueOnce('prompt-image-data');

    const result = await idbStorage.getItem('envelope-key');
    const parsed = JSON.parse(result!);

    expect(parsed).toMatchObject({
      version: 8,
      state: {
        assets: [{ id: 'asset-envelope', data: 'asset-data' }],
        promptState: { uploadedImage: { data: 'prompt-image-data' } },
      },
    });
  });

  it('should handle parse errors gracefully', async () => {
    mockGet.mockResolvedValue('not-valid-json');

    const result = await idbStorage.getItem('bad-key');

    expect(result).toBeNull();
  });

  it('should return null when state hydration times out', async () => {
    vi.useFakeTimers();
    mockGet.mockImplementationOnce(() => new Promise(() => {}));

    const resultPromise = idbStorage.getItem('timeout-key');

    await vi.advanceTimersByTimeAsync(5000);

    await expect(resultPromise).resolves.toBeNull();
  });

  it('should skip reads gracefully when indexedDB is unavailable', async () => {
    Object.defineProperty(globalThis, 'indexedDB', {
      configurable: true,
      value: undefined,
      writable: true,
    });

    const result = await idbStorage.getItem('no-idb-key');

    expect(result).toBeNull();
    expect(mockGet).not.toHaveBeenCalled();
    expect(mockLoggerError).not.toHaveBeenCalled();
  });

  // ─── setItem ────────────────────────────────────────────────────

  it('should dehydrate and save state', async () => {
    const state = { promptState: { idea: 'Test' } };

    await idbStorage.setItem('test-key', JSON.stringify(state));

    expect(mockUpdate).toHaveBeenCalled();
    const parsed = JSON.parse(String(mockRecords.get('test-key')));
    expect(parsed.promptState.idea).toBe('Test');
  });

  it('should dehydrate uploaded image to asset store', async () => {
    const state = {
      promptState: {
        uploadedImage: { data: 'large-base64-data', mimeType: 'image/png' },
      },
    };

    await idbStorage.setItem('test-key', JSON.stringify(state));

    // Should save image data to asset store
    expect(mockSet).toHaveBeenCalledWith(
      'prompt_uploaded_image',
      'large-base64-data',
      expect.anything(),
    );
    // Main state should have placeholder
    const savedState = JSON.parse(String(mockRecords.get('test-key')));
    expect(savedState.promptState.uploadedImage.data).toBe('STORED_IN_IDB');
  });

  it('should dehydrate uploaded audio to asset store', async () => {
    const state = {
      promptState: {
        uploadedAudio: { data: 'audio-base64', mimeType: 'audio/wav', name: 'test.wav' },
      },
    };

    await idbStorage.setItem('test-key', JSON.stringify(state));

    expect(mockSet).toHaveBeenCalledWith(
      'prompt_uploaded_audio',
      'audio-base64',
      expect.anything(),
    );
  });

  it('should dehydrate assets array to asset store', async () => {
    const state = {
      assets: [{ id: 'asset-1', data: 'big-data-here', name: 'photo.png' }],
    };

    await idbStorage.setItem('test-key', JSON.stringify(state));

    expect(mockSet).toHaveBeenCalledWith('asset-1', 'big-data-here', expect.anything());
    const savedState = JSON.parse(String(mockRecords.get('test-key')));
    expect(savedState.assets[0].data).toBe('');
  });

  it('should handle setItem errors gracefully', async () => {
    mockUpdate.mockRejectedValue(new Error('IDB write failed'));

    await expect(idbStorage.setItem('fail-key', '{}')).resolves.toBeUndefined();
    await expect(idbStorage.flush('fail-key')).rejects.toThrow('IDB write failed');
  });

  it('should resolve setItem gracefully when storage writes time out', async () => {
    vi.useFakeTimers();
    mockUpdate.mockImplementation(() => new Promise(() => {}));

    const savePromise = idbStorage.setItem('timeout-key', JSON.stringify({ promptState: {} }));

    await vi.advanceTimersByTimeAsync(5000);

    await expect(savePromise).resolves.toBeUndefined();
    await expect(idbStorage.flush('timeout-key')).rejects.toThrow('timed out');
  });

  it('should skip writes gracefully when indexedDB is unavailable', async () => {
    Object.defineProperty(globalThis, 'indexedDB', {
      configurable: true,
      value: undefined,
      writable: true,
    });

    await expect(
      idbStorage.setItem('no-idb-key', JSON.stringify({ promptState: { idea: 'Test' } })),
    ).resolves.toBeUndefined();
    await expect(idbStorage.flush('no-idb-key')).rejects.toThrow('unavailable');

    expect(mockSet).not.toHaveBeenCalled();
    expect(mockLoggerError).toHaveBeenCalledWith('Storage save failed', expect.any(Error));
  });

  it("atomically preserves another window's asset additions while honoring newer removals", async () => {
    mockRecords.set(
      'catalog-key',
      JSON.stringify({
        state: {
          assets: [{ id: 'older-asset', data: '' }],
          assetCatalogRevisions: { 'older-asset': 1, 'removed-asset': 1 },
          assetCatalogTombstones: { 'removed-asset': 2 },
        },
        version: 8,
      }),
    );

    await idbStorage.setItem(
      'catalog-key',
      JSON.stringify({
        state: {
          assets: [{ id: 'new-window-asset', data: '' }],
          assetCatalogRevisions: { 'new-window-asset': 3 },
          assetCatalogTombstones: {},
        },
        version: 8,
      }),
    );
    const saved = JSON.parse(String(mockRecords.get('catalog-key')));

    expect(saved.state.assets.map((asset: { id: string }) => asset.id).sort()).toEqual([
      'new-window-asset',
      'older-asset',
    ]);
    expect(saved.state.assetCatalogTombstones['removed-asset']).toBe(2);
  });

  // ─── removeItem ─────────────────────────────────────────────────

  it('should delete item from state store', async () => {
    await idbStorage.removeItem('test-key');

    expect(mockDel).toHaveBeenCalledWith('test-key', expect.anything());
  });

  it('should skip deletes gracefully when indexedDB is unavailable', async () => {
    Object.defineProperty(globalThis, 'indexedDB', {
      configurable: true,
      value: undefined,
      writable: true,
    });

    await expect(idbStorage.removeItem('no-idb-key')).resolves.toBeUndefined();

    expect(mockDel).not.toHaveBeenCalled();
    expect(mockLoggerError).not.toHaveBeenCalled();
  });
});
