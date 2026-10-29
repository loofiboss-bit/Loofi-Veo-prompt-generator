import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  calculateProviderMaximumCharge,
  validateProviderCostApproval,
  validateCostApproval,
  computeJobPayloadHash,
  extractJobPayloadFields,
} = require('./paid-job-pricing.cjs');

const request = (overrides = {}) => ({
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
  ...overrides,
});

test('recalculates provider token charges at the privileged boundary', () => {
  assert.equal(calculateProviderMaximumCharge(request()), 0.036);
  assert.equal(validateProviderCostApproval(request()), 0.036);
});

test('tolerates sub-microdollar rounding discrepancies from frontend roundUsd', () => {
  // inputTokens: 27, outputTokens: 8192 on gemini-3.8-flash produces:
  // exact: (27 * 1.5)/1e6 + (8192 * 7.5)/1e6 = 0.0000405 + 0.06144 = 0.0614805 USD
  // frontend roundUsd rounds line items to 6 decimals: 0.000041 + 0.061440 = 0.061481 or 0.061480
  const input = request({
    providerModelId: 'gemini-3.8-flash',
    prompt: 'Short idea prompt',
  });
  input.costApproval = {
    ...input.costApproval,
    providerModelId: 'gemini-3.8-flash',
    verifiedDate: '2026-10-28',
    calculationInputs: { estimatedInputTokens: 27, estimatedOutputTokens: 8192 },
    maximumChargeUsd: 0.06148, // 0.5 microdollars below 0.0614805 due to rounding
  };
  assert.doesNotThrow(() => validateProviderCostApproval(input));
});

test('requires the refreshed pricing source and conservative ceiling for Argon', () => {
  const input = request({ providerModelId: 'gemini-4-argon' });
  input.costApproval = {
    ...input.costApproval,
    providerModelId: input.providerModelId,
    verifiedDate: '2026-10-28',
    maximumChargeUsd: 0.096,
  };
  assert.equal(validateProviderCostApproval(input), 0.096);
  assert.throws(
    () =>
      validateProviderCostApproval({
        ...input,
        costApproval: { ...input.costApproval, verifiedDate: '2026-08-01' },
      }),
    /trusted pricing metadata/,
  );
  assert.throws(
    () =>
      validateProviderCostApproval({
        ...input,
        costApproval: { ...input.costApproval, maximumChargeUsd: 0.056 },
      }),
    /below the trusted conservative estimate/,
  );
});

test('rejects missing, stale, mismatched, and underestimated approvals', () => {
  assert.throws(
    () => validateProviderCostApproval(request({ costApproval: undefined })),
    /cost approval/,
  );
  assert.throws(
    () =>
      validateProviderCostApproval(
        request({
          costApproval: { ...request().costApproval, verifiedDate: '2026-07-01' },
        }),
      ),
    /trusted pricing metadata/,
  );
  assert.throws(
    () =>
      validateProviderCostApproval(
        request({
          costApproval: { ...request().costApproval, maximumChargeUsd: 0.001 },
        }),
      ),
    /below/,
  );
});

test('binds approval token to deterministic SHA-256 payload hash', () => {
  const payload = {
    prompt: 'A cyberpunk city in rain',
    model: 'veo-3.1-fast',
    duration: 8,
    resolution: '720p',
    count: 1,
  };
  const hash1 = computeJobPayloadHash(payload);
  const hash2 = computeJobPayloadHash(payload);
  assert.equal(hash1, hash2);
  assert.equal(hash1.length, 64);

  // Altering any parameter invalidates the hash
  const hashModified = computeJobPayloadHash({ ...payload, duration: 4 });
  assert.notEqual(hash1, hashModified);
});

test('validates payload hash and rejects tampering after cost approval', () => {
  const task = {
    prompt: 'Cyberpunk alley',
    request: {
      modelId: 'veo-3.1-fast',
      prompt: 'Cyberpunk alley',
      durationSeconds: 8,
      resolution: '720p',
    },
    costApproval: {
      modelId: 'veo-3.1-fast',
      maximumChargeUsd: 0.8,
      currency: 'USD',
      confidence: 'exact',
      sourceUrl: 'https://ai.google.dev/gemini-api/docs/pricing',
      verifiedDate: '2026-08-01',
      payloadHash: computeJobPayloadHash({
        prompt: 'Cyberpunk alley',
        model: 'veo-3.1-fast',
        duration: 8,
        resolution: '720p',
        count: 1,
      }),
    },
  };

  // Valid hash passes
  assert.equal(validateCostApproval(task), 0.8);

  // Modifying prompt after approval throws mismatch
  const tamperedTask = {
    ...task,
    request: {
      ...task.request,
      prompt: 'Cyberpunk alley with explosions',
    },
  };
  assert.throws(
    () => validateCostApproval(tamperedTask),
    /Payload hash mismatch: job parameters were modified after cost approval/,
  );

  // Modifying duration after approval throws mismatch
  const tamperedDurationTask = {
    ...task,
    request: {
      ...task.request,
      durationSeconds: 4,
    },
  };
  assert.throws(() => validateCostApproval(tamperedDurationTask), /Payload hash mismatch/);
});
