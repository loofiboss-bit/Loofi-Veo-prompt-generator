import { log } from './loggerService';

interface ProfilerMeasure {
  key: string;
  durationMs: number;
  startedAt: number;
  endedAt: number;
}

class PerformanceProfiler {
  private readonly maxEntries = 200;
  private readonly starts = new Map<string, number>();
  private readonly measures: ProfilerMeasure[] = [];

  start(key: string): void {
    if (typeof performance === 'undefined') {
      return;
    }

    this.starts.set(key, performance.now());
  }

  end(key: string): number | null {
    if (typeof performance === 'undefined') {
      return null;
    }

    const startedAt = this.starts.get(key);
    if (startedAt === undefined) {
      return null;
    }

    const endedAt = performance.now();
    const durationMs = endedAt - startedAt;

    this.starts.delete(key);
    this.measures.push({ key, durationMs, startedAt, endedAt });

    if (this.measures.length > this.maxEntries) {
      this.measures.shift();
    }

    log.info(`Performance metric: ${key}`, 'performance-profiler', {
      durationMs: Number(durationMs.toFixed(2)),
    });

    return durationMs;
  }

  trackSync<T>(key: string, action: () => T): T {
    this.start(key);
    try {
      return action();
    } finally {
      this.end(key);
    }
  }

  async trackAsync<T>(key: string, action: () => Promise<T>): Promise<T> {
    this.start(key);
    try {
      return await action();
    } finally {
      this.end(key);
    }
  }

  getRecentMeasures(count = 25): ProfilerMeasure[] {
    return this.measures.slice(-count);
  }

  clear(): void {
    this.starts.clear();
    this.measures.length = 0;
  }
}

export const performanceProfiler = new PerformanceProfiler();
