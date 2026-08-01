import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { registerPaidJobsIpc } = require('./paid-jobs-ipc.cjs');

const task = (overrides = {}) => ({
  id: 'music-job-1',
  jobKind: 'music',
  status: 'Queued',
  prompt: 'A warm instrumental theme.',
  request: {
    modelId: 'lyria-3-clip-preview',
    prompt: 'A warm instrumental theme.',
    responseFormat: 'mp3',
    images: [],
  },
  costApproval: {
    approvalId: 'renderer-forged-approval',
    modelId: 'lyria-3-clip-preview',
    maximumChargeUsd: 0.04,
    currency: 'USD',
    confidence: 'exact',
    sourceUrl: 'https://ai.google.dev/gemini-api/docs/pricing',
    verifiedDate: '2026-08-01',
    approvedAt: 1,
  },
  timestamp: 1,
  ...overrides,
});

function fixture(responses = [0]) {
  const handlers = new Map();
  const submitted = [];
  const jobs = new Map();
  let dialogs = 0;
  const engine = {
    store: {
      get: async (id) => jobs.get(id),
      readAll: async () => [...jobs.values()],
    },
    submit: async (value) => {
      submitted.push(value);
      jobs.set(value.id, value);
      return value;
    },
    cancel: async () => true,
    retry: async () => true,
  };
  registerPaidJobsIpc({
    ipcMain: { handle: (channel, handler) => handlers.set(channel, handler) },
    getEngine: () => engine,
    dialog: {
      showMessageBox: async () => ({ response: responses[dialogs++] ?? 1 }),
    },
    getMainWindow: () => null,
  });
  return { handlers, submitted, dialogCount: () => dialogs };
}

test('issues approval metadata in main and requires native consent for every new paid job', async () => {
  const context = fixture([0, 1]);
  const first = await context.handlers.get('paid-job-submit')(null, task());
  assert.notEqual(first.costApproval.approvalId, 'renderer-forged-approval');
  assert.match(first.costApproval.approvalId, /^[0-9a-f-]{36}$/i);
  assert.ok(first.costApproval.approvedAt > 1);
  assert.equal(context.submitted.length, 1);

  await assert.rejects(
    context.handlers.get('paid-job-submit')(
      null,
      task({ id: 'music-job-2', costApproval: task().costApproval }),
    ),
    /not approved/,
  );
  assert.equal(context.dialogCount(), 2);
  assert.equal(context.submitted.length, 1);
});

test('returns an existing durable job without asking for or spending another approval', async () => {
  const context = fixture([0]);
  const original = await context.handlers.get('paid-job-submit')(null, task());
  const replay = await context.handlers.get('paid-job-submit')(null, task());
  assert.equal(replay.costApproval.approvalId, original.costApproval.approvalId);
  assert.equal(context.dialogCount(), 1);
  assert.equal(context.submitted.length, 1);
});
