import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  calculateProviderMaximumCharge,
  validateProviderCostApproval,
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
