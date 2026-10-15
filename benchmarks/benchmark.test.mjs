import assert from 'node:assert/strict';
import test from 'node:test';
import { runMediaBenchmark } from './benchmark-media.mjs';
import { runRenderBenchmark } from './benchmark-render.mjs';
import { runArchiveBenchmark } from './benchmark-archive.mjs';
import { median, measure } from './measure.mjs';

test('measurement records CPU and non-heap memory without mutating median inputs', async () => {
  const input = [3, 1, 2, 4];
  assert.equal(median(input), 2.5);
  assert.deepEqual(input, [3, 1, 2, 4]);
  const result = await measure(async () => 'result');
  assert.equal(result.result, 'result');
  for (const key of ['rss', 'heapUsed', 'external', 'arrayBuffers'])
    assert.ok(Number.isFinite(result.memoryBytes.sampledPeak[key]));
  assert.ok(result.durationMs >= 0);
  assert.ok(result.cpuMicros.user >= 0);
});
test('production media benchmark imports and resolves a checksummed fixture', async () => {
  const result = await runMediaBenchmark({ runs: 2, payloadBytes: 1024 });
  assert.equal(result.records.length, 2);
  assert.equal(
    result.records[0].importBytes.result.sha256,
    result.records[1].resolve.result.sha256,
  );
});
test('production render benchmark persists terminal state and verifies ZIP contents', async () => {
  const result = await runRenderBenchmark({ runs: 1, payloadBytes: 1024 });
  assert.equal(result.records[0].progress.result.terminalStatus, 'complete');
  assert.ok(result.records[0].progress.result.persistedNotifications < 502);
  assert.ok(result.records[0].zip.result.outputBytes > 1024);
});
test('production project archive exports binary media and verifies manifest checksum', async () => {
  const result = await runArchiveBenchmark({ runs: 1, payloadBytes: 1024 });
  assert.equal(result.records.length, 1);
  assert.equal(result.payloadSha256.length, 64);
});
