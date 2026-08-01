import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { registerProviderIpc } = require('./provider-ipc.cjs');

function fixture({ dialogResponse = 0 } = {}) {
  const handlers = new Map();
  const ipcMain = { handle: (channel, handler) => handlers.set(channel, handler) };
  let providerCalls = 0;
  registerProviderIpc({
    ipcMain,
    keytar: { getPassword: async () => 'secret-key' },
    keytarService: 'test-service',
    dialog: { showMessageBox: async () => ({ response: dialogResponse }) },
    getMainWindow: () => null,
    vertexAuth: { getClient: async () => ({}) },
    createGeminiClient: async () => ({
      interactions: {
        create: async (request) => ({
          id: 'interaction-approved',
          model: request.model,
          output_text: 'approved interaction',
        }),
      },
    }),
  });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    providerCalls += 1;
    return new Response(
      JSON.stringify({
        modelVersion: 'gemini-3.6-flash',
        candidates: [{ content: { parts: [{ text: 'approved result' }] } }],
      }),
    );
  };
  return {
    handlers,
    providerCalls: () => providerCalls,
    restore: () => {
      globalThis.fetch = originalFetch;
    },
  };
}

const input = () => ({
  provider: 'gemini-api',
  providerModelId: 'gemini-3.6-flash',
  operation: 'plan',
  prompt: 'Build a concise production plan.',
  costApproval: {
    maximumChargeUsd: 0.036,
    currency: 'USD',
    confidence: 'upper-bound',
    sourceUrl: 'https://ai.google.dev/gemini-api/docs/pricing',
    verifiedDate: '2026-08-01',
    providerModelId: 'gemini-3.6-flash',
    calculationInputs: { estimatedInputTokens: 4_000, estimatedOutputTokens: 4_000 },
  },
});

const interactionInput = () => ({
  provider: 'gemini-api',
  providerModelId: 'gemini-omni-flash-preview',
  operation: 'video',
  prompt: 'Create an eight second 720p clip.',
  costApproval: {
    maximumChargeUsd: 0.82,
    currency: 'USD',
    confidence: 'upper-bound',
    sourceUrl: 'https://ai.google.dev/gemini-api/docs/pricing',
    verifiedDate: '2026-08-01',
    providerModelId: 'gemini-omni-flash-preview',
    calculationInputs: {
      estimatedInputTokens: 4_000,
      estimatedOutputTokens: 1,
      videoDurationSeconds: 8,
      videoResolution: '720p',
    },
  },
});

test('requires and consumes a native-approved one-time provider token', async (t) => {
  const context = fixture();
  t.after(context.restore);
  const token = await context.handlers.get('provider-cost-approve')(null, input());
  const result = await context.handlers.get('provider-execute')(null, {
    ...input(),
    approvalToken: token,
  });
  assert.equal(result.text, 'approved result');
  assert.equal(context.providerCalls(), 1);

  const replay = await context.handlers.get('provider-execute')(null, {
    ...input(),
    approvalToken: token,
  });
  assert.match(replay.message, /one-time provider cost approval/);
  assert.equal(context.providerCalls(), 1);
});

test('binds a provider approval to the exact prompt and multimodal payload', async (t) => {
  const context = fixture();
  t.after(context.restore);

  const promptToken = await context.handlers.get('provider-cost-approve')(null, input());
  const changedPrompt = await context.handlers.get('provider-execute')(null, {
    ...input(),
    prompt: `${input().prompt} Add an unapproved paid extension.`,
    approvalToken: promptToken,
  });
  assert.match(changedPrompt.message, /mismatched one-time provider cost approval/);
  assert.equal(context.providerCalls(), 0);

  const mediaToken = await context.handlers.get('provider-cost-approve')(null, input());
  const changedMedia = await context.handlers.get('provider-execute')(null, {
    ...input(),
    inputs: [{ mimeType: 'image/png', data: 'aW1hZ2U=' }],
    approvalToken: mediaToken,
  });
  assert.match(changedMedia.message, /mismatched one-time provider cost approval/);
  assert.equal(context.providerCalls(), 0);
});

test('runs an approved Gemini interaction through the one-time provider boundary', async (t) => {
  const context = fixture();
  t.after(context.restore);
  const token = await context.handlers.get('provider-cost-approve')(null, interactionInput());
  const result = await context.handlers.get('provider-interaction')(null, {
    ...interactionInput(),
    approvalToken: token,
  });

  assert.equal(result.text, 'approved interaction');
  assert.equal(result.interactionId, 'interaction-approved');

  const replay = await context.handlers.get('provider-interaction')(null, {
    ...interactionInput(),
    approvalToken: token,
  });
  assert.match(replay.message, /one-time provider cost approval/);
});

test('cancellation never reaches a provider', async (t) => {
  const context = fixture({ dialogResponse: 1 });
  t.after(context.restore);
  await assert.rejects(
    context.handlers.get('provider-cost-approve')(null, input()),
    /not approved/,
  );
  assert.equal(context.providerCalls(), 0);
});

test('credential status does not run a paid canary', async (t) => {
  const context = fixture();
  t.after(context.restore);
  const result = await context.handlers.get('provider-test-connection')(null, {
    profile: { provider: 'gemini-api' },
    providerModelId: 'gemini-3.6-flash',
  });
  assert.equal(result.ok, true);
  assert.match(result.message, /No paid generation canary/);
  assert.equal(context.providerCalls(), 0);
});
