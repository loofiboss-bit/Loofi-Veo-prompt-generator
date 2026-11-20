#!/usr/bin/env node
/**
 * check-bundle-budget.mjs
 * Enforces renderer bundle asset constraints:
 *  - Zero unused *asyncify*.wasm files emitted into dist/assets/
 *  - Core ONNX Whisper ASR wasm runtime stays intact
 *  - Total dist/assets/ size remains below 22 MB
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_ASSETS_DIR = path.resolve(__dirname, '../dist/assets');
const MAX_ASSETS_BYTES = 22 * 1024 * 1024;

if (!fs.existsSync(DIST_ASSETS_DIR)) {
  console.error(
    `✗ dist/assets directory not found at ${DIST_ASSETS_DIR}. Run "npm run build" first.`,
  );
  process.exit(1);
}

const files = fs
  .readdirSync(DIST_ASSETS_DIR, { withFileTypes: true })
  .filter((entry) => entry.isFile())
  .map((entry) => {
    const fullPath = path.join(DIST_ASSETS_DIR, entry.name);
    return {
      name: entry.name,
      bytes: fs.statSync(fullPath).size,
    };
  })
  .sort((a, b) => b.bytes - a.bytes);

const asyncifyWasmFiles = files.filter((file) => /asyncify.*\.wasm$/i.test(file.name));
if (asyncifyWasmFiles.length > 0) {
  console.error(
    `✗ Forbidden unused asyncify WASM emitted in dist/assets/: ${asyncifyWasmFiles.map((f) => f.name).join(', ')}`,
  );
  process.exit(1);
}

const onnxWasmFiles = files.filter((file) => /^ort-wasm-simd-threaded.*\.wasm$/i.test(file.name));
if (onnxWasmFiles.length === 0) {
  console.error('✗ Required ort-wasm-simd-threaded*.wasm runtime is missing from dist/assets/.');
  process.exit(1);
}

const totalBytes = files.reduce((sum, file) => sum + file.bytes, 0);
const totalMb = (totalBytes / (1024 * 1024)).toFixed(2);
const budgetMb = (MAX_ASSETS_BYTES / (1024 * 1024)).toFixed(2);

console.log(`dist/assets total: ${totalMb} MB (budget: < ${budgetMb} MB)`);
console.log('Top 5 largest assets:');
for (const file of files.slice(0, 5)) {
  console.log(`  - ${file.name}: ${(file.bytes / (1024 * 1024)).toFixed(2)} MB`);
}

if (totalBytes >= MAX_ASSETS_BYTES) {
  console.error(`✗ Bundle budget exceeded: ${totalMb} MB >= ${budgetMb} MB.`);
  process.exit(1);
}

console.log('✓ Bundle budget passed cleanly with asyncify WASM excluded and ASR runtime intact.');
