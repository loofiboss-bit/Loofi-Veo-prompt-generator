import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import JSZip from 'jszip';

export async function runRenderBenchmark() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'perf-bench-render-'));

  try {
    // 1. Simulerad FFmpeg progress hantering (Unthrottled vs Throttled)
    // Utan throttling: Varje framsteg (t.ex. 500 ticks) gör atomic writeFile + rename + onUpdate
    let unthrottledWrites = 0;
    let unthrottledIpc = 0;
    const unthrottledStart = performance.now();
    for (let i = 0; i < 500; i++) {
      const p = i / 500;
      const job = { id: 'bench-job', status: 'rendering', progress: p };
      const tempPath = path.join(tmpDir, 'job.json.tmp');
      await fs.writeFile(tempPath, JSON.stringify(job));
      await fs.rename(tempPath, path.join(tmpDir, 'job.json'));
      unthrottledWrites++;
      unthrottledIpc++;
    }
    const unthrottledDurationMs = performance.now() - unthrottledStart;

    // Med tidsbaserad throttling (150ms fönster över samma sekvens):
    let throttledWrites = 0;
    let throttledIpc = 0;
    const throttledStart = performance.now();
    let lastPersistTime = 0;
    const THROTTLE_MS = 150;

    for (let i = 0; i < 500; i++) {
      const p = i / 500;
      const now = performance.now();
      const isTerminal = i === 499;
      if (isTerminal || now - lastPersistTime >= THROTTLE_MS) {
        lastPersistTime = now;
        const job = { id: 'bench-job', status: isTerminal ? 'complete' : 'rendering', progress: p };
        const tempPath = path.join(tmpDir, 'job-throttled.json.tmp');
        await fs.writeFile(tempPath, JSON.stringify(job));
        await fs.rename(tempPath, path.join(tmpDir, 'job-throttled.json'));
        throttledWrites++;
        throttledIpc++;
      }
    }
    const throttledDurationMs = performance.now() - throttledStart;

    // 2. ZIP Export Packaging Memory Benchmark
    // Skapa en 25MB testvideofil
    const testVideo = Buffer.alloc(25 * 1024 * 1024, 0x55);
    
    // Monolitisk JSZip generering (nuvarande metod: nodebuffer i RAM)
    if (global.gc) global.gc();
    const memBeforeZip = process.memoryUsage().heapUsed;
    const zipStart = performance.now();
    const zip = new JSZip();
    zip.file('video.mp4', testVideo);
    zip.file('metadata.json', JSON.stringify({ title: 'Test Export' }));
    const bufferResult = await zip.generateAsync({ type: 'nodebuffer' });
    const zipDurationMs = performance.now() - zipStart;
    const memAfterZip = process.memoryUsage().heapUsed;
    const zipHeapDeltaMb = Math.max(0, (memAfterZip - memBeforeZip) / (1024 * 1024));

    return {
      progressUpdates: {
        totalTicks: 500,
        unthrottled: {
          diskWrites: unthrottledWrites,
          ipcEvents: unthrottledIpc,
          durationMs: Math.round(unthrottledDurationMs),
        },
        throttled: {
          diskWrites: throttledWrites,
          ipcEvents: throttledIpc,
          durationMs: Math.round(throttledDurationMs),
        },
        diskIoReductionPct: Number((((unthrottledWrites - throttledWrites) / unthrottledWrites) * 100).toFixed(1)),
      },
      zipPackaging: {
        payloadSizeMb: 25,
        outputSizeMb: Number((bufferResult.length / (1024 * 1024)).toFixed(2)),
        durationMs: Math.round(zipDurationMs),
        heapDeltaMb: Number(zipHeapDeltaMb.toFixed(2)),
      },
    };
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}

if (process.argv[1]?.endsWith('benchmark-render.mjs')) {
  const results = await runRenderBenchmark();
  console.log(JSON.stringify(results, null, 2));
}
