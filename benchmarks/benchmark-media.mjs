import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

async function measureMemory(fn) {
  if (global.gc) global.gc();
  const memBefore = process.memoryUsage();
  const timeStart = performance.now();
  const result = await fn();
  const timeEnd = performance.now();
  const memAfter = process.memoryUsage();
  return {
    result,
    durationMs: timeEnd - timeStart,
    heapUsedDeltaMb: (memAfter.heapUsed - memBefore.heapUsed) / (1024 * 1024),
    rssDeltaMb: (memAfter.rss - memBefore.rss) / (1024 * 1024),
  };
}

async function sha256Buffered(filePath) {
  const buffer = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function sha256Streamed(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

function base64RoundTrip(buffer) {
  const b64 = buffer.toString('base64');
  return Buffer.from(b64, 'base64');
}

function directBufferAccess(buffer) {
  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
}

export async function runMediaBenchmark() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'perf-bench-media-'));
  const testFileSizeMb = 40;
  const testFilePath = path.join(tmpDir, 'test-media.dat');
  
  // Generate test file
  const chunk = Buffer.alloc(1024 * 1024, 0x42);
  const handle = await fs.open(testFilePath, 'w');
  for (let i = 0; i < testFileSizeMb; i++) {
    await handle.write(chunk);
  }
  await handle.close();

  try {
    // 1. Buffered SHA-256
    const bufferedSha = await measureMemory(() => sha256Buffered(testFilePath));

    // 2. Streamed SHA-256
    const streamedSha = await measureMemory(() => sha256Streamed(testFilePath));

    // 3. Base64 roundtrip vs direct binary
    const sampleBuffer = await fs.readFile(testFilePath);
    const b64Conversion = await measureMemory(() => base64RoundTrip(sampleBuffer));
    const directBinary = await measureMemory(() => directBufferAccess(sampleBuffer));

    return {
      testFileSizeMb,
      bufferedSha: {
        durationMs: Math.round(bufferedSha.durationMs),
        heapDeltaMb: Number(bufferedSha.heapUsedDeltaMb.toFixed(2)),
      },
      streamedSha: {
        durationMs: Math.round(streamedSha.durationMs),
        heapDeltaMb: Number(streamedSha.heapUsedDeltaMb.toFixed(2)),
      },
      b64Conversion: {
        durationMs: Math.round(b64Conversion.durationMs),
        heapDeltaMb: Number(b64Conversion.heapUsedDeltaMb.toFixed(2)),
      },
      directBinary: {
        durationMs: Math.round(directBinary.durationMs),
        heapDeltaMb: Number(directBinary.heapUsedDeltaMb.toFixed(2)),
      },
      hashesMatch: bufferedSha.result === streamedSha.result,
    };
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}

if (process.argv[1]?.endsWith('benchmark-media.mjs')) {
  const results = await runMediaBenchmark();
  console.log(JSON.stringify(results, null, 2));
}
