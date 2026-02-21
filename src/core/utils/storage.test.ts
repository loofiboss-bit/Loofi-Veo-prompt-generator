import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGet, mockSet, mockDel, mockCreateStore } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockSet: vi.fn(),
  mockDel: vi.fn(),
  mockCreateStore: vi.fn().mockReturnValue('mock-store'),
}));

vi.mock('idb-keyval', () => ({
  createStore: (...args: unknown[]) => mockCreateStore(...args),
  get: (...args: unknown[]) => mockGet(...args),
  set: (...args: unknown[]) => mockSet(...args),
  del: (...args: unknown[]) => mockDel(...args),
}));

vi.mock('@core/services/loggerService', () => ({
  logger: { error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { idbStorage } from './storage';

describe('idbStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue(undefined);
    mockSet.mockResolvedValue(undefined);
    mockDel.mockResolvedValue(undefined);
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

  it('should handle parse errors gracefully', async () => {
    mockGet.mockResolvedValue('not-valid-json');

    const result = await idbStorage.getItem('bad-key');

    expect(result).toBeNull();
  });

  // ─── setItem ────────────────────────────────────────────────────

  it('should dehydrate and save state', async () => {
    const state = { promptState: { idea: 'Test' } };

    await idbStorage.setItem('test-key', JSON.stringify(state));

    expect(mockSet).toHaveBeenCalled();
    const savedValue = mockSet.mock.calls[0][1];
    const parsed = JSON.parse(savedValue);
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
    const mainStateSaveCall = mockSet.mock.calls.find((c: unknown[]) => c[0] === 'test-key');
    const savedState = JSON.parse(mainStateSaveCall![1] as string);
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
    const mainStateSaveCall = mockSet.mock.calls.find((c: unknown[]) => c[0] === 'test-key');
    const savedState = JSON.parse(mainStateSaveCall![1] as string);
    expect(savedState.assets[0].data).toBe('');
  });

  it('should handle setItem errors gracefully', async () => {
    mockSet.mockRejectedValue(new Error('IDB write failed'));

    await expect(idbStorage.setItem('fail-key', '{}')).resolves.toBeUndefined();
  });

  // ─── removeItem ─────────────────────────────────────────────────

  it('should delete item from state store', async () => {
    await idbStorage.removeItem('test-key');

    expect(mockDel).toHaveBeenCalledWith('test-key', expect.anything());
  });
});
