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
test('dirty check and snapshot serialization overhead completes under 5ms on a 20-shot payload', async () => {
  const shots = Array.from({ length: 20 }, (_, i) => ({
    id: i + 1,
    action: `Action shot ${i + 1} with camera motion`,
    camera: 'Pan right 45 degrees, slow track',
    duration: 4,
    lens: '35mm anamorphic',
    lighting: 'Golden hour side light',
    dialogue: `Character line ${i + 1}`,
  }));
  const tracks = [
    { id: 'track-v1', type: 'video', name: 'Main Video', clips: [] },
    { id: 'track-v2', type: 'video', name: 'Overlay B-Roll', clips: [] },
    { id: 'track-a1', type: 'audio', name: 'Dialogue', clips: [] },
    { id: 'track-a2', type: 'audio', name: 'Score', clips: [] },
  ];
  const clips = Array.from({ length: 20 }, (_, i) => ({
    id: `clip-${i + 1}`,
    trackId: i % 2 === 0 ? 'track-v1' : 'track-v2',
    name: `Shot ${i + 1}`,
    startTime: i * 4,
    duration: 4,
    sourceStart: 0,
    type: 'video',
  }));
  const project = {
    id: 'bench-project-20-shots',
    name: 'Benchmark Project',
    schemaVersion: 18,
    mutationVersion: 42,
    documentRevision: 5,
    promptState: {
      targetModel: 'veo-3.1-quality',
      idea: 'Epic cinematic journey through neon cityscape',
      environment: 'Cyberpunk rainy downtown',
      lightingStyle: 'Neon reflection',
      artStyle: 'Cinematic Photoreal',
      aspectRatio: '16:9',
      duration: '8s',
    },
    storyboard: {
      shots,
      timeline: { tracks, clips, zoomLevel: 1, currentTime: 0 },
    },
    characterBank: [
      { id: 'char-1', name: 'Alex', role: 'Protagonist', description: 'Detective in trench coat' },
    ],
    locationBank: [
      {
        id: 'loc-1',
        name: 'Neon Alley',
        description: 'Rain-soaked street with holographic billboards',
      },
    ],
  };

  // Warm-up
  for (let i = 0; i < 5; i++) {
    JSON.stringify(project);
    structuredClone(project);
  }

  const measured = await measure(async () => {
    const serialized = JSON.stringify(project);
    const parsed = JSON.parse(serialized);
    assert.equal(parsed.id, project.id);
    assert.equal(parsed.storyboard.shots.length, 20);
    return serialized.length;
  });

  assert.ok(measured.durationMs < 5, `Expected dirty check < 5ms, got ${measured.durationMs}ms`);
});
