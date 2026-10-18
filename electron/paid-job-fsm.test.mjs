import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  PaidJobFSM,
  PaidJobJournal,
  VALID_FSM_TRANSITIONS,
} = require('./paid-job-fsm.cjs');

test('PaidJobFSM transitions follow valid state paths', () => {
  let job = {
    id: 'test-fsm-1',
    state: 'DRAFT',
    prompt: 'A misty fjord at dawn',
    model: 'veo-3.1-fast',
  };

  // DRAFT -> QUOTED
  job = PaidJobFSM.transition(job, 'QUOTED', {}, 'Price quoted');
  assert.equal(job.state, 'QUOTED');

  // QUOTED -> APPROVED
  job = PaidJobFSM.transition(
    job,
    'APPROVED',
    {
      approvalToken: 'app-token-1',
      payloadHash: 'hash-1',
    },
    'User confirmed approval',
  );
  assert.equal(job.state, 'APPROVED');

  // APPROVED -> DISPATCHING
  job = PaidJobFSM.transition(job, 'DISPATCHING', { dispatchToken: 'd-1' });
  assert.equal(job.state, 'DISPATCHING');

  // DISPATCHING -> RUNNING
  job = PaidJobFSM.transition(job, 'RUNNING', { providerOperationId: 'ops/1' });
  assert.equal(job.state, 'RUNNING');

  // RUNNING -> COMPLETED
  job = PaidJobFSM.transition(job, 'COMPLETED', { resultMediaUri: 'file:///media.mp4' });
  assert.equal(job.state, 'COMPLETED');
});

test('PaidJobFSM blocks illegal transitions and missing approval tokens', () => {
  const job = {
    id: 'test-fsm-2',
    state: 'DRAFT',
  };

  assert.throws(
    () => PaidJobFSM.transition(job, 'RUNNING'),
    /Invalid FSM transition/,
  );

  const quotedJob = {
    id: 'test-fsm-3',
    state: 'QUOTED',
  };
  const approvedJob = PaidJobFSM.transition(quotedJob, 'APPROVED');

  assert.throws(
    () => PaidJobFSM.transition(approvedJob, 'DISPATCHING'),
    /Cannot transition to DISPATCHING without an approval token/,
  );
});

test('PaidJobFSM handles crash recovery preventing double dispatching', () => {
  const dispatchingJob = {
    id: 'test-fsm-4',
    state: 'DISPATCHING',
    dispatchToken: 'd-1',
  };

  // Crash during dispatch without operation ID -> FAILED
  const recovered = PaidJobFSM.recoverAfterCrash(dispatchingJob);
  assert.equal(recovered.state, 'FAILED');
  assert.match(recovered.error, /Double-dispatch prevented/);

  // Crash during dispatch with confirmed operation ID -> resumes RUNNING
  const withOp = {
    id: 'test-fsm-5',
    state: 'DISPATCHING',
    providerOperationName: 'operations/123',
  };
  const recoveredWithOp = PaidJobFSM.recoverAfterCrash(withOp);
  assert.equal(recoveredWithOp.state, 'RUNNING');
});

test('PaidJobJournal appends and recovers state transitions', async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'veo-fsm-journal-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));

  const journalPath = path.join(dir, 'paid-jobs.jsonl');
  const journal = new PaidJobJournal(journalPath);

  await journal.append({
    jobId: 'job-1',
    from: 'DRAFT',
    to: 'QUOTED',
    payloadHash: 'hash-abc',
  });

  await journal.append({
    jobId: 'job-1',
    from: 'QUOTED',
    to: 'APPROVED',
    payloadHash: 'hash-abc',
  });

  const entries = await journal.readAll();
  assert.equal(entries.length, 2);
  assert.equal(entries[0].from, 'DRAFT');
  assert.equal(entries[1].to, 'APPROVED');
});
