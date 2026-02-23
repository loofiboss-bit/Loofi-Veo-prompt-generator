#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const COVERAGE_PATH = 'coverage/coverage-summary.json';
const DEFAULT_THRESHOLDS = {
  statements: 52,
  branches: 40,
  functions: 47,
  lines: 53,
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

  if (failed) {
    process.exit(1);
  }

  console.log('All coverage thresholds met');
}

main();
