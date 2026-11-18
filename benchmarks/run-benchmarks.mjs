import fs from 'node:fs/promises';
import path from 'node:path';
import { runMediaBenchmark } from './benchmark-media.mjs';
import { runRenderBenchmark } from './benchmark-render.mjs';
import { runStartupBenchmark } from './benchmark-startup.mjs';
import { runArchiveBenchmark } from './benchmark-archive.mjs';
import { runSqliteBenchmark } from './benchmark-sqlite.mjs';
import { environment } from './measure.mjs';

const help = `Usage: npm run benchmark -- [--output PATH] [--runs 5]
  --baseline-executable PATH --candidate-executable PATH  Include paired packaged startup (5 pairs)
  --startup-pairs N  Override pair count for harness smoke tests only
Local production media/render scenarios always run; no comparison is claimed without a measured baseline.
Three.js lifecycle correctness is covered by production regression tests, not synthetic performance simulations.`;
async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    console.log(help);
    return;
  }
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    if (
      ![
        '--output',
        '--runs',
        '--baseline-executable',
        '--candidate-executable',
        '--startup-pairs',
      ].includes(args[i]) ||
      !args[i + 1]
    )
      throw new Error(help);
    options[args[i].slice(2)] = args[i + 1];
  }
  for (const key of ['runs', 'startup-pairs'])
    if (
      options[key] &&
      (!/^\d+$/.test(options[key]) || Number(options[key]) < 1 || Number(options[key]) > 100)
    )
      throw new Error(`Invalid --${key}`);
  if (Boolean(options['baseline-executable']) !== Boolean(options['candidate-executable']))
    throw new Error('Supply both packaged executables.');
  const report = {
    schemaVersion: 2,
    startedAt: new Date().toISOString(),
    environment: environment(),
    methodology:
      'Production APIs only. Memory bytes include RSS, heap, external and arrayBuffers; 5 ms sampled peak may miss shorter peaks. Absolute process memory includes harness/runtime overhead; GC is requested before local scenarios if available. Fixtures are deterministic and setup is excluded. No performance improvement can be inferred from this candidate-only local run.',
    scenarios: {},
  };
  try {
    report.scenarios.media = await runMediaBenchmark({ runs: Number(options.runs || 5) });
    report.scenarios.render = await runRenderBenchmark({ runs: Number(options.runs || 5) });
    report.scenarios.archive = await runArchiveBenchmark({ runs: Number(options.runs || 5) });
    report.scenarios.sqlite = await runSqliteBenchmark({ runs: Number(options.runs || 5) });
    const budgets = {
      sqliteMedianMs: 15,
      archiveMedianMs: 5_000,
      mediaResolveMedianMs: 2_000,
      renderZipMedianMs: 5_000,
    };
    report.budgets = budgets;
    if ((report.scenarios.sqlite?.medianMs ?? Infinity) >= budgets.sqliteMedianMs) {
      throw new Error(
        `SQLite 50-scene median ${report.scenarios.sqlite?.medianMs}ms exceeded budget ${budgets.sqliteMedianMs}ms.`,
      );
    }
    if ((report.scenarios.archive?.medians?.durationMs ?? Infinity) >= budgets.archiveMedianMs) {
      throw new Error(
        `Archive streaming median ${report.scenarios.archive?.medians?.durationMs}ms exceeded budget ${budgets.archiveMedianMs}ms.`,
      );
    }
    if (
      (report.scenarios.media?.medians?.resolve?.durationMs ?? Infinity) >=
      budgets.mediaResolveMedianMs
    ) {
      throw new Error(
        `Media resolve median ${report.scenarios.media?.medians?.resolve?.durationMs}ms exceeded budget ${budgets.mediaResolveMedianMs}ms.`,
      );
    }
    if (
      (report.scenarios.render?.medians?.zip?.durationMs ?? Infinity) >= budgets.renderZipMedianMs
    ) {
      throw new Error(
        `Render ZIP median ${report.scenarios.render?.medians?.zip?.durationMs}ms exceeded budget ${budgets.renderZipMedianMs}ms.`,
      );
    }
    report.scenarios.startup = options['baseline-executable']
      ? await runStartupBenchmark({
          baselineExecutable: options['baseline-executable'],
          candidateExecutable: options['candidate-executable'],
          pairs: Number(options['startup-pairs'] || 5),
        })
      : {
          status: 'not-run',
          reason: 'Supply both packaged executable paths for paired startup measurements.',
        };
    report.status = 'passed';
  } catch (error) {
    report.status = 'failed';
    report.error = error.stack || String(error);
    process.exitCode = 1;
  } finally {
    report.finishedAt = new Date().toISOString();
    const serialized = `${JSON.stringify(report, null, 2)}\n`;
    if (options.output) {
      const destination = path.resolve(options.output);
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.writeFile(destination, serialized);
      console.log(`Benchmark report: ${destination} (${report.status})`);
    } else console.log(serialized);
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
