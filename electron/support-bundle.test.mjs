import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { buildSupportSnapshot, redactText } = require('./support-bundle.cjs');

test('redacts API keys, authorization values, and URL credentials', () => {
  const source =
    'api_key=AIzaabcdefghijklmnopqrstuvwxyz123456 Authorization: Bearer-secret https://x.test?key=secret';
  const redacted = redactText(source);
  assert.equal(redacted.includes('AIza'), false);
  assert.equal(redacted.includes('Bearer-secret'), false);
  assert.equal(redacted.includes('?key=secret'), false);
});

test('support snapshot includes operational state but excludes prompts and credentials', () => {
  const snapshot = buildSupportSnapshot({
    now: 0,
    app: { version: '8.0.0' },
    platform: { platform: 'linux' },
    providerConfigured: true,
    storage: { bytes: 42, files: 1 },
    jobs: [
      { id: '1', status: 'Polling', prompt: 'private story', request: { modelId: 'veo-3.1-fast' } },
    ],
    logs: ['token=secret'],
  });
  assert.equal(snapshot.provider.credentialsIncluded, false);
  assert.equal(JSON.stringify(snapshot).includes('private story'), false);
  assert.equal(JSON.stringify(snapshot).includes('token=secret'), false);
  assert.equal(snapshot.jobs[0].modelId, 'veo-3.1-fast');
});
