import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  classifyHttpFailure,
  executeGemini,
  executeOllama,
  executeVertex,
  executeInteraction,
  resolveOllamaEndpoint,
  validateProviderInput,
} = require('./provider-runtime.cjs');

test('provider runtime rejects arbitrary providers, models, and Ollama hosts', () => {
  assert.throws(() =>
    validateProviderInput({
      provider: 'evil',
      providerModelId: 'x',
      operation: 'plan',
      prompt: '',
    }),
  );
  assert.throws(() => resolveOllamaEndpoint('https://example.com'));
  assert.equal(resolveOllamaEndpoint('http://127.0.0.1:11434'), 'http://127.0.0.1:11434');
});

test('Interactions API persists IDs and threads follow-up edits', async () => {
  let request;
  const result = await executeInteraction(
    {
      providerModelId: 'gemini-omni-flash-preview',
      prompt: 'Keep the subject and make the camera slower.',
      inputs: [{ mimeType: 'video/mp4', data: 'dmlkZW8=' }],
      interactionId: 'interaction-parent',
    },
    {
      interactions: {
        create: async (input) => {
          request = input;
          return {
            id: 'interaction-child',
            model: 'gemini-omni-flash-preview',
            output_text: 'Revision complete.',
          };
        },
      },
    },
  );
  assert.equal(request.store, true);
  assert.equal(request.previous_interaction_id, 'interaction-parent');
  assert.equal(request.input[1].type, 'video');
  assert.equal(result.interactionId, 'interaction-child');
  assert.equal(result.text, 'Revision complete.');
});

test('Interactions API receives cancellation as an SDK request option', async () => {
  const controller = new AbortController();
  let started;
  const startedPromise = new Promise((resolve) => (started = resolve));
  const operation = executeInteraction(
    {
      providerModelId: 'gemini-omni-flash-preview',
      prompt: 'Revise the prompt.',
      signal: controller.signal,
    },
    {
      interactions: {
        create: async (_input, options) => {
          assert.equal(options.abortSignal, controller.signal);
          started();
          return await new Promise((_resolve, reject) => {
            options.abortSignal.addEventListener(
              'abort',
              () => reject(options.abortSignal.reason),
              {
                once: true,
              },
            );
          });
        },
      },
    },
  );
  await startedPromise;
  controller.abort(new DOMException('Cancelled', 'AbortError'));
  await assert.rejects(operation, { name: 'AbortError' });
});

test('Vertex execution uses ADC OAuth and its distinct regional API surface', async () => {
  let captured;
  const result = await executeVertex(
    validateProviderInput({
      provider: 'vertex-ai',
      providerModelId: 'gemini-3.1-pro',
      operation: 'plan',
      prompt: 'Reply OK.',
    }),
    { projectId: 'studio-project-123', location: 'europe-west4' },
    { getAccessToken: async () => 'oauth-token' },
    async (url, init) => {
      captured = { url, init };
      return new Response(
        JSON.stringify({ candidates: [{ content: { parts: [{ text: 'OK' }] } }] }),
        { status: 200 },
      );
    },
  );
  assert.equal(result.text, 'OK');
  assert.match(
    captured.url,
    /europe-west4-aiplatform\.googleapis\.com\/v1\/projects\/studio-project-123/,
  );
  assert.match(captured.url, /models\/gemini-3\.1-pro:generateContent$/);
  assert.equal(captured.init.headers.authorization, 'Bearer oauth-token');
  assert.equal(JSON.stringify(captured).includes('service_account'), false);
});

test('Vertex connection reports missing ADC credentials without making a request', async () => {
  const result = await executeVertex(
    validateProviderInput({
      provider: 'vertex-ai',
      providerModelId: 'gemini-3.5-flash',
      operation: 'plan',
      prompt: 'Reply OK.',
    }),
    { projectId: 'studio-project-123', location: 'global' },
    { getAccessToken: async () => null },
    () => assert.fail('fetch must not run without ADC'),
  );
  assert.equal(result.failure, 'authentication');
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

test('Gemini, Vertex, and Ollama pass cancellation to the actual fetch without serializing it', async () => {
  for (const provider of ['gemini', 'vertex', 'ollama']) {
    const controller = new AbortController();
    let started;
    const startedPromise = new Promise((resolve) => (started = resolve));
    const fetchImpl = async (_url, init) => {
      assert.equal(init.signal, controller.signal);
      assert.equal(init.body.includes('AbortSignal'), false);
      started();
      return await new Promise((_resolve, reject) => {
        init.signal.addEventListener('abort', () => reject(init.signal.reason), { once: true });
      });
    };
    const request = {
      providerModelId: 'gemini-3.5-flash',
      operation: 'plan',
      prompt: 'Build a concise plan.',
      signal: controller.signal,
    };
    const operation =
      provider === 'gemini'
        ? executeGemini(request, 'test-key', fetchImpl)
        : provider === 'vertex'
          ? executeVertex(
              request,
              { projectId: 'studio-project-123', location: 'global' },
              { getAccessToken: async () => 'token' },
              fetchImpl,
            )
          : executeOllama(request, 'http://127.0.0.1:11434', fetchImpl);
    await startedPromise;
    controller.abort(new DOMException('Cancelled', 'AbortError'));
    await assert.rejects(operation, { name: 'AbortError' });
  }
});

test('HTTP errors receive stable provider classifications', () => {
  assert.equal(classifyHttpFailure(401), 'authentication');
  assert.equal(classifyHttpFailure(429, 'rate limit'), 'rate-limit');
  assert.equal(classifyHttpFailure(503), 'provider-incident');
});
