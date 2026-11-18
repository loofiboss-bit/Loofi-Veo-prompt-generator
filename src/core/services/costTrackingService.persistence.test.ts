import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore } from 'idb-keyval';

const storage = vi.hoisted(() => new Map<string, unknown>());
vi.mock('idb-keyval', () => ({
  createStore: vi.fn((database: string, store: string) => `${database}/${store}`),
  get: vi.fn(async (key: string, store: string) => storage.get(`${store}/${key}`)),
  set: vi.fn(async (key: string, value: unknown, store: string) => {
    storage.set(`${store}/${key}`, value);
  }),
  update: vi.fn(async (key: string, updater: (value: unknown) => unknown, store: string) => {
    const address = `${store}/${key}`;
    storage.set(address, updater(storage.get(address)));
  }),
}));
vi.mock('./loggerService', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

const dedicated = 'veo-cost-tracking/cost-tracking/';
const monthKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};
const ledger = (totalUsd = 5) => ({
  schemaVersion: 2,
  records: [],
  seen: ['existing-job'],
  totalUsd,
  monthlyUsd: totalUsd,
  monthKey: monthKey(),
  legacyCutoff: 0,
});
const cost = (sourceJobId = 'new-job') => ({
  sourceJobId,
  timestamp: Date.now(),
  modelId: 'veo-3.1-generate-preview',
  endpointId: 'veo',
  inputTokens: 0,
  outputTokens: 0,
  costUsd: 1,
  isEstimated: true,
  description: 'Paid take',
});

/** Model only the native read-only migration boundary; primary writes use idb-keyval above. */
function legacyDatabase(
  options: {
    exists?: boolean;
    hasCostStore?: boolean;
    data?: Record<string, unknown>;
    beforeComplete?: () => void;
    failure?: Error;
  } = {},
) {
  const reads: string[] = [];
  const transaction = {
    oncomplete: undefined as undefined | (() => void),
    onerror: undefined as undefined | (() => void),
    onabort: undefined as undefined | (() => void),
    error: options.failure,
    objectStore: vi.fn(() => ({
      get: vi.fn((key: string) => {
        reads.push(key);
        const request = {
          result: options.data?.[key],
          onsuccess: undefined as undefined | (() => void),
        };
        queueMicrotask(() => request.onsuccess?.());
        return request;
      }),
    })),
  };
  const database = {
    close: vi.fn(),
    objectStoreNames: { contains: vi.fn(() => options.hasCostStore ?? false) },
    transaction: vi.fn((_name: string, _mode: string) => {
      setTimeout(() => {
        options.beforeComplete?.();
        if (options.failure) transaction.onerror?.();
        else transaction.oncomplete?.();
      }, 0);
      return transaction;
    }),
  };
  const request = {
    result: database,
    error: new DOMException('The upgrade was aborted.', 'AbortError'),
    transaction: { abort: vi.fn(() => queueMicrotask(() => request.onerror?.())) },
    onupgradeneeded: undefined as undefined | (() => void),
    onerror: undefined as undefined | (() => void),
    onsuccess: undefined as undefined | (() => void),
  };
  const open = vi.fn(() => {
    queueMicrotask(() => {
      if (options.exists === false) request.onupgradeneeded?.();
      else request.onsuccess?.();
    });
    return request;
  });
  vi.stubGlobal('indexedDB', { open });
  return { open, database, request, reads };
}

async function loadService() {
  return (await import('./costTrackingService')).costTrackingService;
}

describe('costTrackingService dedicated persistence and migration', () => {
  beforeEach(() => {
    storage.clear();
    vi.clearAllMocks();
    vi.resetModules();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('persists costs when the shared database contains only another feature store', async () => {
    const legacy = legacyDatabase({ hasCostStore: false });
    const service = await loadService();
    await service.recordPaidJobCost(cost());
    expect(createStore).toHaveBeenCalledWith('veo-cost-tracking', 'cost-tracking');
    expect(legacy.database.transaction).not.toHaveBeenCalled();
    expect(service.getState()).toMatchObject({ lifetimeTotalUsd: 1, persistenceError: undefined });
    expect(storage.get(`${dedicated}cost-ledger-v2`)).toMatchObject({
      seen: ['new-job'],
      totalUsd: 1,
    });
  });

  it('does not create the shared database on a clean installation', async () => {
    const legacy = legacyDatabase({ exists: false });
    const service = await loadService();
    await service.hydrate();
    expect(legacy.request.transaction.abort).toHaveBeenCalledOnce();
    expect(legacy.database.transaction).not.toHaveBeenCalled();
    expect(service.getState().persistenceError).toBeUndefined();
  });

  it('migrates legacy totals, records and budget without rewriting old data', async () => {
    const record = { ...cost('old-job'), id: 'legacy-record', timestamp: 1 };
    const data = {
      'cost-lifetime-v1': { totalUsd: 7, monthlyUsd: 3, monthKey: monthKey() },
      'cost-records-v1': [record],
      'cost-budget-v1': 20,
    };
    const legacy = legacyDatabase({ hasCostStore: true, data });
    const service = await loadService();
    await service.hydrate();
    expect(service.getState()).toMatchObject({
      lifetimeTotalUsd: 7,
      monthlySpentUsd: 3,
      monthlyBudgetUsd: 20,
    });
    expect(storage.get(`${dedicated}cost-ledger-v2`)).toMatchObject({
      records: [record],
      seen: ['old-job'],
      totalUsd: 7,
    });
    expect(legacy.database.transaction).toHaveBeenCalledWith('cost-tracking', 'readonly');
    expect(legacy.reads).toHaveLength(4);
    await service.recordPaidJobCost(record);
    expect(service.getState().lifetimeTotalUsd).toBe(7);
    expect(data['cost-lifetime-v1'].totalUsd).toBe(7);
  });

  it('preserves an existing v2 ledger and its durable job identities', async () => {
    legacyDatabase({
      hasCostStore: true,
      data: { 'cost-ledger-v2': ledger(), 'cost-budget-v1': 10 },
    });
    const service = await loadService();
    await service.recordPaidJobCost(cost('existing-job'));
    expect(service.getState().lifetimeTotalUsd).toBe(5);
    expect(storage.get(`${dedicated}cost-ledger-v2`)).toEqual(ledger());
    vi.resetModules();
    const legacy = legacyDatabase({ hasCostStore: true, data: { 'cost-ledger-v2': ledger(1) } });
    const restarted = await loadService();
    await restarted.hydrate();
    expect(legacy.open).not.toHaveBeenCalled();
    expect(restarted.getState()).toMatchObject({ lifetimeTotalUsd: 5, monthlyBudgetUsd: 10 });
  });

  it('never overwrites newer dedicated data written by another renderer during migration', async () => {
    legacyDatabase({
      hasCostStore: true,
      data: { 'cost-ledger-v2': ledger(2), 'cost-budget-v1': 8 },
      beforeComplete: () => {
        storage.set(`${dedicated}cost-ledger-v2`, ledger(12));
        storage.set(`${dedicated}cost-budget-v1`, null);
      },
    });
    const service = await loadService();
    await service.hydrate();
    expect(service.getState()).toMatchObject({ lifetimeTotalUsd: 12, monthlyBudgetUsd: null });
  });

  it('awaits migration before setting a new budget', async () => {
    legacyDatabase({
      hasCostStore: true,
      data: { 'cost-ledger-v2': ledger(), 'cost-budget-v1': 8 },
    });
    const service = await loadService();
    await service.setMonthlyBudget(30);
    expect(storage.get(`${dedicated}cost-budget-v1`)).toBe(30);
    expect(service.getState()).toMatchObject({ lifetimeTotalUsd: 5, monthlyBudgetUsd: 30 });
  });

  it('keeps migration retryable when the old data cannot be read', async () => {
    legacyDatabase({ hasCostStore: true, failure: new Error('Read unavailable') });
    const service = await loadService();
    await expect(service.hydrate()).rejects.toThrow('Read unavailable');
    expect(storage.has(`${dedicated}cost-ledger-v2`)).toBe(false);
    expect(service.getState().persistenceError).toBeDefined();
    legacyDatabase({ hasCostStore: true, data: { 'cost-ledger-v2': ledger(4) } });
    await service.hydrate();
    expect(service.getState()).toMatchObject({ lifetimeTotalUsd: 4, persistenceError: undefined });
  });
});
