import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CostRecord } from '@core/types';
const { records, update } = vi.hoisted(() => {
  const records = new Map<string, unknown>();
  return {
    records,
    update: vi.fn(async (key: string, transform: (old: unknown) => unknown) => {
      records.set(key, transform(records.get(key)));
    }),
  };
});
vi.mock('idb-keyval', () => ({
  createStore: vi.fn(),
  get: async (key: string) => records.get(key),
  set: async (key: string, value: unknown) => {
    records.set(key, value);
  },
  update,
}));
vi.mock('./loggerService', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
const fresh = async () => {
  vi.resetModules();
  return (await import('./costTrackingService')).costTrackingService;
};
const cost = (id = 'paid-job'): Omit<CostRecord, 'id'> & { sourceJobId: string } => ({
  sourceJobId: id,
  timestamp: Date.now(),
  modelId: 'veo-3.1-fast',
  endpointId: 'desktop-paid-job',
  inputTokens: 0,
  outputTokens: 0,
  costUsd: 0.8,
  isEstimated: false,
  description: 'Test completion',
});
afterEach(() => vi.useRealTimers());
beforeEach(() => {
  records.clear();
  update.mockClear();
});
describe('durable paid cost ledger', () => {
  it('counts overlapping observations once and retains deduplication across a new renderer', async () => {
    const service = await fresh();
    await Promise.all([service.recordPaidJobCost(cost()), service.recordPaidJobCost(cost())]);
    expect(service.getState().lifetimeTotalUsd).toBe(0.8);
    expect(service.getState().sessionRecords[0].isEstimated).toBe(true);
    const restarted = await fresh();
    await restarted.recordPaidJobCost(cost());
    expect(restarted.getState().lifetimeTotalUsd).toBe(0.8);
    expect(restarted.getState().sessionTotalUsd).toBe(0);
  });
  it('preserves the legacy aggregate without adding old completed jobs again', async () => {
    records.set('cost-lifetime-v1', { totalUsd: 12, monthlyUsd: 0, monthKey: '2020-01' });
    const service = await fresh();
    await service.recordPaidJobCost({ ...cost('old-job'), timestamp: 1 });
    expect(service.getState().lifetimeTotalUsd).toBe(12);
    await service.recordPaidJobCost({ ...cost('new-job'), timestamp: Date.now() + 100 });
    expect(service.getState().lifetimeTotalUsd).toBe(12.8);
  });
  it('does not consume a receipt on persistence failure and allows a durable retry', async () => {
    const service = await fresh();
    await service.hydrate();
    update.mockRejectedValueOnce(new Error('Disk unavailable'));
    await expect(service.recordPaidJobCost(cost())).rejects.toThrow('Disk unavailable');
    expect(service.getState().persistenceError).toBeTruthy();
    expect(service.getState().lifetimeTotalUsd).toBe(0);
    await service.recordPaidJobCost(cost());
    expect(service.getState().lifetimeTotalUsd).toBe(0.8);
    expect(service.getState().persistenceError).toBeUndefined();
  });
});

it('shares the native job identity with the local queue wrapper', async () => {
  const service = await fresh();
  service.recordEstimatedCost(
    {
      modelId: 'veo-3.1-fast',
      estimatedInputTokens: 0,
      estimatedOutputTokens: 0,
      estimatedCostUsd: 0.8,
      confidence: 'exact',
    },
    'video-generation',
    'Queue wrapper',
    'shared-job',
  );
  await service.recordPaidJobCost(cost('shared-job'));
  await service.flush();
  expect(service.getState().lifetimeTotalUsd).toBe(0.8);
});

it('rolls the monthly estimate over without restarting or replaying older completions', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-10T12:00:00Z'));
  const service = await fresh();
  const october = cost('october');
  await service.recordPaidJobCost(october);
  vi.setSystemTime(new Date('2026-11-10T12:00:00Z'));
  expect(service.getState().monthlySpentUsd).toBe(0);
  await service.recordPaidJobCost(october);
  await service.recordPaidJobCost(cost('november'));
  expect(service.getState().monthlySpentUsd).toBe(0.8);
  expect(service.getState().lifetimeTotalUsd).toBe(1.6);
});
