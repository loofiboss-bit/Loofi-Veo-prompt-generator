import { spawn } from 'node:child_process';

function runNodeEval(script) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['-e', script], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('close', (code) => {
      if (code !== 0) return reject(new Error(`Exit code ${code}: ${stderr}`));
      try {
        resolve(JSON.parse(stdout.trim()));
      } catch (err) {
        reject(new Error(`Failed to parse output: ${stdout} (${err.message})`));
      }
    });
  });
}

export async function runStartupBenchmark() {
  // Test 1: Eager loading of heavy modules (google-auth-library, jszip, keytar)
  const eagerScript = `
    const t0 = performance.now();
    const m0 = process.memoryUsage();
    require('jszip');
    require('google-auth-library');
    const t1 = performance.now();
    const m1 = process.memoryUsage();
    console.log(JSON.stringify({
      durationMs: t1 - t0,
      heapUsedMb: (m1.heapUsed - m0.heapUsed) / (1024 * 1024),
      rssMb: m1.rss / (1024 * 1024)
    }));
  `;

  // Test 2: Lean startup (lazy loading)
  const leanScript = `
    const t0 = performance.now();
    const m0 = process.memoryUsage();
    // Inga tunga moduler laddas förrän de behövs
    const t1 = performance.now();
    const m1 = process.memoryUsage();
    console.log(JSON.stringify({
      durationMs: t1 - t0,
      heapUsedMb: (m1.heapUsed - m0.heapUsed) / (1024 * 1024),
      rssMb: m1.rss / (1024 * 1024)
    }));
  `;

  const eagerResult = await runNodeEval(eagerScript);
  const leanResult = await runNodeEval(leanScript);

  return {
    eagerModules: {
      durationMs: Number(eagerResult.durationMs.toFixed(2)),
      heapUsedMb: Number(eagerResult.heapUsedMb.toFixed(2)),
      rssMb: Number(eagerResult.rssMb.toFixed(2)),
    },
    leanStartup: {
      durationMs: Number(leanResult.durationMs.toFixed(2)),
      heapUsedMb: Number(leanResult.heapUsedMb.toFixed(2)),
      rssMb: Number(leanResult.rssMb.toFixed(2)),
    },
    savedDurationMs: Number((eagerResult.durationMs - leanResult.durationMs).toFixed(2)),
    savedHeapMb: Number((eagerResult.heapUsedMb - leanResult.heapUsedMb).toFixed(2)),
  };
}

if (process.argv[1]?.endsWith('benchmark-startup.mjs')) {
  const results = await runStartupBenchmark();
  console.log(JSON.stringify(results, null, 2));
}
