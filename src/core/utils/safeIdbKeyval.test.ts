import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGet = vi.fn();
const mockSet = vi.fn();
const mockDel = vi.fn();
const mockKeys = vi.fn();
const mockClear = vi.fn();

vi.mock('idb-keyval', () => ({
  get: (...args: unknown[]) => mockGet(...args),
  set: (...args: unknown[]) => mockSet(...args),
  del: (...args: unknown[]) => mockDel(...args),
  keys: (...args: unknown[]) => mockKeys(...args),
  clear: (...args: unknown[]) => mockClear(...args),
  createStore: vi.fn(),
}));

vi.mock('@core/services/loggerService', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

describe('safeIdbKeyval', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockSet.mockResolvedValue(undefined);
    mockDel.mockResolvedValue(undefined);
  });

  it('should delegate get to idb-keyval when available', async () => {
    mockGet.mockResolvedValue('hello');
    const { safeGet } = await import('./safeIdbKeyval');
    const result = await safeGet<string>('key1');
    expect(result).toBe('hello');
    expect(mockGet).toHaveBeenCalledWith('key1', undefined);
  });

  it('should delegate set to idb-keyval when available', async () => {
    const { safeSet } = await import('./safeIdbKeyval');
    await safeSet('key1', 'value1');
    expect(mockSet).toHaveBeenCalled();
  });

  it('should delegate del to idb-keyval when available', async () => {
    const { safeDel } = await import('./safeIdbKeyval');
    await safeDel('key1');
    expect(mockDel).toHaveBeenCalledWith('key1', undefined);
  });

  it('should delegate keys to idb-keyval when available', async () => {
    mockKeys.mockResolvedValue(['a', 'b']);
    const { safeKeys } = await import('./safeIdbKeyval');
    const result = await safeKeys();
    expect(result).toEqual(['a', 'b']);
  });

  it('should delegate clear to idb-keyval when available', async () => {
    mockClear.mockResolvedValue(undefined);
    const { safeClear } = await import('./safeIdbKeyval');
    await safeClear();
    expect(mockClear).toHaveBeenCalled();
  });

  it('should fall back to in-memory store on get failure', async () => {
    mockSet.mockRejectedValueOnce(new Error('QuotaExceededError'));
    mockGet.mockRejectedValue(new Error('IDB dead'));
    const { safeGet, safeSet } = await import('./safeIdbKeyval');
    await safeSet('fallback-key', 42);
    const result = await safeGet<number>('fallback-key');
    expect(result).toBe(42);
  });
});
