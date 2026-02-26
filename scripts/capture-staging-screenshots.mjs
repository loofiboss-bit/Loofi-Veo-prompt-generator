#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const stagingUrl = process.env.STAGING_URL || 'http://localhost:8080';
const outputDir = process.env.SCREENSHOT_DIR || 'test-results/manual-verify';
const waitTimeout = process.env.SCREENSHOT_WAIT_MS || '3000';
const retries = Number(process.env.STAGING_HEALTH_RETRIES || '15');
const retryDelayMs = Number(process.env.STAGING_HEALTH_RETRY_DELAY_MS || '2000');
const browsers = ['chromium', 'firefox', 'webkit'];

async function waitForStaging() {
  for (let i = 1; i <= retries; i += 1) {
    try {
      const response = await fetch(stagingUrl, { method: 'GET' });
      if (response.ok) {
        return;
      }
    } catch {
      // retry
    }

    await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
  }

  throw new Error(`Staging URL ${stagingUrl} did not become reachable after ${retries} attempts.`);
}

function runScreenshot(browser) {
  const outputPath = path.join(outputDir, `staging-home-${browser}.png`);
  const args = [
    'playwright',
    'screenshot',
    '--browser',
    browser,
    '--wait-for-timeout',
    String(waitTimeout),
    '--full-page',
    stagingUrl,
    outputPath,
  ];

  const result = spawnSync('npx', args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    throw new Error(`Screenshot capture failed for ${browser}.`);
  }
}

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });

  console.log(`Checking staging reachability at ${stagingUrl}...`);
  await waitForStaging();

  for (const browser of browsers) {
    console.log(`Capturing ${browser} screenshot...`);
    runScreenshot(browser);
  }

  console.log('Screenshots captured successfully:');
  for (const browser of browsers) {
    console.log(`- ${path.join(outputDir, `staging-home-${browser}.png`)}`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
