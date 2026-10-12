import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { runMediaBenchmark } from './benchmark-media.mjs';
import { runRenderBenchmark } from './benchmark-render.mjs';
import { runStartupBenchmark } from './benchmark-startup.mjs';
import { runThreeJsBenchmark } from './benchmark-threejs.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASELINE_FILE = path.join(__dirname, 'baseline-results.json');
const isBaselineMode = process.argv.includes('--save-baseline');

async function main() {
  console.log('====================================================');
  console.log('   Loofi Creator Studio Performance Benchmark Suite  ');
  console.log('====================================================\n');

  console.log('⏳ Kör Media-benchmark...');
  const media = await runMediaBenchmark();

  console.log('⏳ Kör Render Engine & I/O-benchmark...');
  const render = await runRenderBenchmark();

  console.log('⏳ Kör Startup & Module Evaluation-benchmark...');
  const startup = await runStartupBenchmark();

  console.log('⏳ Kör Three.js Allocations-benchmark...');
  const threejs = await runThreeJsBenchmark();

  const currentRun = {
    timestamp: new Date().toISOString(),
    media,
    render,
    startup,
    threejs,
  };

  if (isBaselineMode) {
    await fs.writeFile(BASELINE_FILE, JSON.stringify(currentRun, null, 2), 'utf8');
    console.log(`\n✅ Baseline sparad till ${BASELINE_FILE}\n`);
  }

  let baseline = null;
  try {
    baseline = JSON.parse(await fs.readFile(BASELINE_FILE, 'utf8'));
  } catch {
    // Ingen tidigare baseline
  }

  // Skriv ut rapport
  console.log('\n================== MÄTRESULTAT ==================\n');

  console.log('### 1. Mediehantering & Hashing (40 MB payload)');
  console.log(`- Buffer Sha256:   ${media.bufferedSha.durationMs} ms, Heap Delta: ${media.bufferedSha.heapDeltaMb} MB`);
  console.log(`- Streamed Sha256: ${media.streamedSha.durationMs} ms, Heap Delta: ${media.streamedSha.heapDeltaMb} MB`);
  console.log(`- Base64 Roundtrip: ${media.b64Conversion.durationMs} ms, Heap Delta: ${media.b64Conversion.heapDeltaMb} MB`);
  console.log(`- Direkt Binär:     ${media.directBinary.durationMs} ms, Heap Delta: ${media.directBinary.heapDeltaMb} MB`);
  console.log(`- Hash Check:       ${media.hashesMatch ? 'MATCH (verifierad)' : 'MISMATCH'}\n`);

  console.log('### 2. Renderingsmotor (500 framstegsticks & 25 MB ZIP)');
  console.log(`- Othrottlad: ${render.progressUpdates.unthrottled.diskWrites} disk-skrivningar (${render.progressUpdates.unthrottled.durationMs} ms)`);
  console.log(`- Throttlad:   ${render.progressUpdates.throttled.diskWrites} disk-skrivningar (${render.progressUpdates.throttled.durationMs} ms)`);
  console.log(`- Minskning disk-I/O: ${render.progressUpdates.diskIoReductionPct} %`);
  console.log(`- ZIP Packaging: ${render.zipPackaging.durationMs} ms, Heap Delta: ${render.zipPackaging.heapDeltaMb} MB\n`);

  console.log('### 3. Startup & Modulladdning');
  console.log(`- Eager Modules: ${startup.eagerModules.durationMs} ms, Heap: ${startup.eagerModules.heapUsedMb} MB, RSS: ${startup.eagerModules.rssMb} MB`);
  console.log(`- Lean Startup:  ${startup.leanStartup.durationMs} ms, Heap: ${startup.leanStartup.heapUsedMb} MB, RSS: ${startup.leanStartup.rssMb} MB`);
  console.log(`- Besparing:     ${startup.savedDurationMs} ms snabbare, ${startup.savedHeapMb} MB mindre heap\n`);

  console.log('### 4. Three.js Återanvändning (100 frames)');
  console.log(`- Nuvarande:  ${threejs.currentPattern.totalGeometriesCreated} geometrier skapade (${threejs.currentPattern.durationMs} ms)`);
  console.log(`- Optimerad:  ${threejs.optimizedPattern.totalGeometriesCreated} geometrier skapade (${threejs.optimizedPattern.durationMs} ms)`);
  console.log(`- Reduktion allokeringar: ${threejs.allocationReductionPct} %`);
  console.log(`- Reduktion CPU-tid:      ${threejs.durationReductionPct} %\n`);

  console.log('====================================================\n');
}

main().catch((err) => {
  console.error('Benchmark misslyckades:', err);
  process.exit(1);
});
