import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import JSZip from 'jszip';
import { CreatorRenderEngine } from '../electron/creator-render.cjs';
import { measure, summary } from './measure.mjs';

export async function runRenderBenchmark({ runs = 5, payloadBytes = 25 * 1024 * 1024 } = {}) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'creator-benchmark-render-'));
  const records = [];
  try {
    const video = Buffer.alloc(payloadBytes, 0x55);
    const outputSha256 = createHash('sha256').update(video).digest('hex');
    await fs.writeFile(path.join(directory, 'output.mp4'), video);
    await fs.writeFile(
      path.join(directory, 'captions.srt'),
      '1\n00:00:00,000 --> 00:00:01,000\nBenchmark\n',
    );
    await fs.writeFile(path.join(directory, 'cover.png'), Buffer.from('benchmark-cover'));
    let updates = 0;
    const engine = new CreatorRenderEngine({
      root: directory,
      runtimeRoot: directory,
      onUpdate: () => updates++,
    });
    for (let index = 0; index < runs; index++) {
      const state = {
        directory,
        outputSha256,
        job: { id: 'benchmark-job', status: 'queued', progress: 0 },
        plan: {
          title: 'Benchmark',
          description: 'Synthetic bytes, no codec measurement',
          projectId: 'benchmark',
          contentHash: 'benchmark',
          durationSeconds: 1,
          aspectRatio: '16:9',
        },
      };
      engine.jobs.set(state.job.id, state);
      const progress = await measure(async () => {
        const before = updates;
        await engine.update(state, { status: 'rendering', progress: 0 });
        for (let tick = 1; tick < 500; tick++) await engine.update(state, { progress: tick / 500 });
        await engine.update(state, { status: 'verifying', progress: 1 });
        await engine.update(state, { status: 'complete', progress: 1 });
        const persisted = JSON.parse(await fs.readFile(path.join(directory, 'job.json'), 'utf8'));
        assert.equal(persisted.status, 'complete');
        return {
          inputProgressTicks: 499,
          persistedNotifications: updates - before,
          terminalStatus: persisted.status,
        };
      });
      const destination = path.join(directory, `delivery-${index}.zip`);
      const zip = await measure(async () => {
        await engine.save(state.job.id, destination, true);
        return { outputBytes: (await fs.stat(destination)).size };
      });
      // Validate outside measurement so JSZip readback does not contaminate export metrics.
      const archive = await JSZip.loadAsync(await fs.readFile(destination));
      for (const name of [
        'video.mp4',
        'captions.srt',
        'cover.png',
        'publication.txt',
        'delivery-report.json',
      ])
        assert.ok(archive.file(name), name);
      assert.equal(
        createHash('sha256')
          .update(await archive.file('video.mp4').async('nodebuffer'))
          .digest('hex'),
        outputSha256,
      );
      records.push({ run: index + 1, progress, zip });
      await fs.rm(destination);
    }
    return {
      scenario: 'CreatorRenderEngine.update and save(asPackage=true)',
      payloadBytes,
      limitations:
        'Deterministic synthetic video/cover bytes exercise packaging, not FFmpeg or image decoding. Tight progress burst is a stress workload, not a real-time video performance claim.',
      records,
      medians: {
        progress: summary(records.map((r) => r.progress)),
        zip: summary(records.map((r) => r.zip)),
      },
    };
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}
