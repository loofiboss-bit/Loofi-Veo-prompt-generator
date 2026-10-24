import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { registerPaidJobsIpc } = require('./paid-jobs-ipc.cjs');
const { createPaidSubmission, requireApprovedSubmission } = require('../paid-job-submission.cjs');

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

function fixture(responses = [0], onDialog = () => {}) {
  const handlers = new Map();
  const submitted = [];
  const retried = [];
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
    retry: async (...args) => {
      retried.push(args);
      return true;
    },
  };
  registerPaidJobsIpc({
    ipcMain: { handle: (channel, handler) => handlers.set(channel, handler) },
    getEngine: () => engine,
    dialog: {
      showMessageBox: async (...args) => {
        onDialog(...args);
        return { response: responses[dialogs++] ?? 1 };
      },
    },
    getMainWindow: () => null,
  });
  return { handlers, submitted, retried, jobs, dialogCount: () => dialogs };
}

test('issues approval metadata in main and requires native consent for every new paid job', async () => {
  const context = fixture([0, 1]);
  const first = await context.handlers.get('paid-job-submit')(null, task());
  assert.notEqual(first.costApproval.approvalId, 'renderer-forged-approval');
  assert.match(first.costApproval.approvalId, /^[0-9a-f-]{36}$/i);
  assert.ok(first.costApproval.approvedAt > 1);
  assert.equal(first.costApproval.hashVersion, 2);
  assert.equal(requireApprovedSubmission(first).body, createPaidSubmission(task()).body);
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

test('does not seek renewed paid consent for recovery without an operation identity', async () => {
  const context = fixture([0]);
  context.jobs.set('music-job-1', task({ status: 'RecoveryRequired' }));
  assert.equal(await context.handlers.get('paid-job-retry')(null, 'music-job-1'), false);
  assert.equal(context.dialogCount(), 0);
});

test('recovers known video media failures without authorizing another submission', async () => {
  const context = fixture([0]);
  context.jobs.set('video-job-1', {
    id: 'video-job-1',
    status: 'MediaAtRisk',
    providerOperationName: 'operations/existing',
  });
  assert.equal(await context.handlers.get('paid-job-retry')(null, 'video-job-1'), true);
  assert.equal(context.dialogCount(), 0);
});

test('scoped recovery refuses ambiguous or unrelated jobs without paid approval', async () => {
  const context = fixture([0]);
  const identity = { id: 'video-job', runId: 'run', shotId: 1, takeId: 'take' };
  context.jobs.set(identity.id, {
    id: identity.id,
    status: 'RecoveryRequired',
    productionRunId: 'run',
    productionShotId: 1,
    productionTakeId: 'take',
  });
  const recover = context.handlers.get('paid-job-recover');
  assert.equal(await recover(null, identity), false);
  context.jobs.get(identity.id).providerOperationName = 'operations/existing';
  assert.equal(await recover(null, { ...identity, takeId: 'other' }), false);
  assert.equal(await recover(null, identity), true);
  assert.equal(context.dialogCount(), 0);
  assert.equal(context.submitted.length, 0);
});

test('freezes the actual request before native consent, ignoring renderer mutation during the dialog', async () => {
  const input = task({
    request: { ...task().request, images: [{ data: 'b2xk', mimeType: 'image/png' }] },
  });
  const expected = createPaidSubmission(input);
  const context = fixture([0], (_window, options) => {
    assert.ok(options.detail.includes('A warm instrumental theme.'));
    input.request.prompt = 'Unapproved replacement.';
    input.request.images[0].data = 'bmV3';
    input.costApproval.maximumChargeUsd = 100;
    input.approvedSubmission = { body: 'renderer-forged bytes' };
  });
  const approved = await context.handlers.get('paid-job-submit')(null, input);
  assert.deepEqual(approved.approvedSubmission, expected);
  assert.equal(approved.request.prompt, 'A warm instrumental theme.');
  assert.equal(approved.costApproval.maximumChargeUsd, 0.04);
  assert.equal(requireApprovedSubmission(approved).body, expected.body);
});

test('deduplicates concurrent native approvals of one job identity', async () => {
  const context = fixture([0]);
  const [first, second] = await Promise.all([
    context.handlers.get('paid-job-submit')(null, task()),
    context.handlers.get('paid-job-submit')(null, task()),
  ]);
  assert.equal(first.costApproval.approvalId, second.costApproval.approvalId);
  assert.equal(context.dialogCount(), 1);
  assert.equal(context.submitted.length, 1);
});

test('renews a legacy unsent job with a new frozen native request approval', async () => {
  const context = fixture([0]);
  const legacy = task({ status: 'Error' });
  context.jobs.set(legacy.id, legacy);
  assert.equal(await context.handlers.get('paid-job-retry')(null, legacy.id), true);
  assert.equal(context.dialogCount(), 1);
  const [id, approval, submission] = context.retried[0];
  assert.equal(id, legacy.id);
  assert.equal(approval.hashVersion, 2);
  assert.notEqual(approval.approvalId, legacy.costApproval.approvalId);
  assert.doesNotThrow(() =>
    requireApprovedSubmission({
      ...legacy,
      costApproval: approval,
      approvedSubmission: submission,
    }),
  );
});
