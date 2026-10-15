import { execFileSync } from 'node:child_process';
import os from 'node:os';

export function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
export async function measure(operation) {
  global.gc?.();
  const memoryBefore = process.memoryUsage();
  let peak = { ...memoryBefore };
  const sample = () => {
    const current = process.memoryUsage();
    for (const key of Object.keys(current)) peak[key] = Math.max(peak[key], current[key]);
  };
  const timer = setInterval(sample, 5);
  const cpu = process.cpuUsage();
  const start = performance.now();
  try {
    const result = await operation();
    sample();
    return {
      result,
      durationMs: performance.now() - start,
      cpuMicros: process.cpuUsage(cpu),
      memoryBytes: { before: memoryBefore, after: process.memoryUsage(), sampledPeak: peak },
    };
  } finally {
    clearInterval(timer);
  }
}
export function summary(records) {
  return {
    durationMs: median(records.map((r) => r.durationMs)),
    cpuUserMicros: median(records.map((r) => r.cpuMicros.user)),
    cpuSystemMicros: median(records.map((r) => r.cpuMicros.system)),
    sampledPeakMemoryBytes: Object.fromEntries(
      ['rss', 'heapUsed', 'external', 'arrayBuffers'].map((key) => [
        key,
        median(records.map((r) => r.memoryBytes.sampledPeak[key])),
      ]),
    ),
  };
}
export function environment() {
  const git = (args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
  return {
    source: {
      commit: git(['rev-parse', 'HEAD']),
      dirty: git(['status', '--porcelain']).length > 0,
    },
    platform: process.platform,
    architecture: process.arch,
    osRelease: os.release(),
    cpu: os.cpus()[0]?.model,
    logicalCpus: os.cpus().length,
    totalMemoryBytes: os.totalmem(),
    node: process.version,
    versions: process.versions,
    displaySession: process.env.XDG_SESSION_TYPE || null,
  };
}
