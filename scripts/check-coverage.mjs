#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const COVERAGE_PATH = 'coverage/coverage-summary.json';
const DEFAULT_THRESHOLDS = {
  statements: 52,
  branches: 40,
  functions: 47,
  lines: 53,
};

const CRITICAL_FILE_THRESHOLDS = {
  'src/core/models/catalog.ts': { lines: 95, branches: 85 },
  'src/core/models/router.ts': { lines: 85, branches: 60 },
  'src/core/providers/providerRouter.ts': { lines: 90, branches: 70 },
  'src/core/services/mediaAssetService.ts': { lines: 75, branches: 65 },
  'src/core/services/productionPreflightService.ts': { lines: 85, branches: 70 },
  'src/core/services/productionRunService.ts': { lines: 80, branches: 60 },
  'src/core/services/veoGenerationService.ts': { lines: 85, branches: 70 },
};

function readCoverageSummary() {
  try {
    const raw = readFileSync(COVERAGE_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`::error::Coverage summary not found or invalid at ${COVERAGE_PATH}: ${message}`);
    process.exit(1);
  }
}

function main() {
  const coverage = readCoverageSummary();
  const totals = coverage?.total;

  if (!totals) {
    console.error('::error::Coverage summary missing "total" section');
    process.exit(1);
  }

  let failed = false;

  for (const [metric, min] of Object.entries(DEFAULT_THRESHOLDS)) {
    const actual = totals?.[metric]?.pct;

    if (typeof actual !== 'number') {
      console.error(`::error::Coverage metric "${metric}" missing in summary`);
      failed = true;
      continue;
    }

    if (actual < min) {
      console.error(`FAIL: ${metric} coverage ${actual}% < ${min}% threshold`);
      failed = true;
    } else {
      console.log(`PASS: ${metric} coverage ${actual}% >= ${min}% threshold`);
    }
  }

  for (const [suffix, thresholds] of Object.entries(CRITICAL_FILE_THRESHOLDS)) {
    const entry = Object.entries(coverage).find(([file]) =>
      file.replaceAll('\\', '/').endsWith(suffix),
    );
    if (!entry) {
      console.error(`FAIL: critical coverage entry missing for ${suffix}`);
      failed = true;
      continue;
    }
    const [, summary] = entry;
    for (const [metric, min] of Object.entries(thresholds)) {
      const actual = summary?.[metric]?.pct;
      if (typeof actual !== 'number' || actual < min) {
        console.error(`FAIL: ${suffix} ${metric} coverage ${actual ?? 'missing'}% < ${min}%`);
        failed = true;
      } else {
        console.log(`PASS: ${suffix} ${metric} coverage ${actual}% >= ${min}%`);
      }
    }
  }

  if (failed) {
    process.exit(1);
  }

  console.log('All coverage thresholds met');
}

main();
