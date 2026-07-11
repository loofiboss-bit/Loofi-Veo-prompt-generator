import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  classifyHttpFailure,
  executeGemini,
  resolveOllamaEndpoint,
  validateProviderInput,
} = require('./provider-runtime.cjs');

test('provider runtime rejects arbitrary providers, models, and Ollama hosts', () => {
  assert.throws(() =>
    validateProviderInput({ provider: 'evil', providerModelId: 'x', operation: 'plan', prompt: '' }),
  );
  assert.throws(() => resolveOllamaEndpoint('https://example.com'));
  assert.equal(resolveOllamaEndpoint('http://127.0.0.1:11434'), 'http://127.0.0.1:11434');
});

test('Gemini execution keeps the API key in a header and normalizes output', async () => {
  let captured;
  const fetchImpl = async (url, init) => {
    captured = { url, init };
    return new Response(
      JSON.stringify({
        modelVersion: 'gemini-3.5-flash',
        candidates: [{ content: { parts: [{ text: 'OK' }] } }],
      }),
      { status: 200 },
    );
  };
  const result = await executeGemini(
    validateProviderInput({
      provider: 'gemini-api',
      providerModelId: 'gemini-3.5-flash',
      operation: 'plan',
      prompt: 'Reply OK.',
    }),
    'secret-key',
    fetchImpl,
  );
  assert.equal(result.text, 'OK');
  assert.equal(captured.init.headers['x-goog-api-key'], 'secret-key');
  assert.equal(captured.url.includes('secret-key'), false);
});

test('HTTP errors receive stable provider classifications', () => {
  assert.equal(classifyHttpFailure(401), 'authentication');
  assert.equal(classifyHttpFailure(429, 'rate limit'), 'rate-limit');
  assert.equal(classifyHttpFailure(503), 'provider-incident');
});
