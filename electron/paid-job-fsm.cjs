'use strict';

const fs = require('fs');
const path = require('path');

const VALID_FSM_TRANSITIONS = Object.freeze({
  DRAFT: Object.freeze(['QUOTED', 'CANCELLED']),
  QUOTED: Object.freeze(['APPROVED', 'QUOTED', 'DRAFT', 'CANCELLED']),
  APPROVED: Object.freeze(['DISPATCHING', 'CANCELLED']),
  DISPATCHING: Object.freeze(['RUNNING', 'FAILED', 'CANCELLED']),
  RUNNING: Object.freeze(['COMPLETED', 'FAILED', 'CANCELLED']),
  COMPLETED: Object.freeze([]),
  FAILED: Object.freeze(['QUOTED', 'DRAFT']),
  CANCELLED: Object.freeze([]),
});

class PaidJobFSM {
  static canTransition(fromState, toState) {
    const allowed = VALID_FSM_TRANSITIONS[fromState];
    return Array.isArray(allowed) && allowed.includes(toState);
  }

  static transition(job, targetState, updates = {}, reason = '') {
    if (!job || typeof job !== 'object') {
      throw new Error('A valid job object is required for FSM transition.');
    }
    const current = job.state || 'DRAFT';
    if (!PaidJobFSM.canTransition(current, targetState)) {
      throw new Error(`Invalid FSM transition: ${current} -> ${targetState} for job ${job.id}.`);
    }

    if (targetState === 'DISPATCHING') {
      const approvalToken =
        updates.approvalToken || job.approvalToken || job.costApproval?.approvalId;
      const payloadHash = updates.payloadHash || job.payloadHash || job.costApproval?.payloadHash;
      if (!approvalToken) {
        throw new Error('Cannot transition to DISPATCHING without an approval token.');
      }
      if (!payloadHash) {
        throw new Error('Cannot transition to DISPATCHING without a verified payloadHash.');
      }
    }

    const now = Date.now();
    const updated = {
      ...job,
      ...updates,
      state: targetState,
      updatedAt: now,
      history: [
        ...(Array.isArray(job.history) ? job.history : []),
        { from: current, to: targetState, timestamp: now, reason },
      ],
    };
    return updated;
  }

  static recoverAfterCrash(job) {
    const now = Date.now();
    const current = job.state || 'DRAFT';
    if (current === 'DISPATCHING') {
      if (job.providerOperationName || job.providerOperationId) {
        return {
          ...job,
          state: 'RUNNING',
          updatedAt: now,
          history: [
            ...(Array.isArray(job.history) ? job.history : []),
            {
              from: 'DISPATCHING',
              to: 'RUNNING',
              timestamp: now,
              reason: 'Recovered active operation after restart',
            },
          ],
        };
      }
      return {
        ...job,
        state: 'FAILED',
        error:
          'AMBIGUOUS_CRASH_DURING_DISPATCH: In-flight dispatch was interrupted. Double-dispatch prevented.',
        updatedAt: now,
        history: [
          ...(Array.isArray(job.history) ? job.history : []),
          {
            from: 'DISPATCHING',
            to: 'FAILED',
            timestamp: now,
            reason: 'Prevented duplicate dispatch after unconfirmed restart',
          },
        ],
      };
    }

    if (current === 'RUNNING' && !job.providerOperationName && !job.providerOperationId) {
      return {
        ...job,
        state: 'FAILED',
        error: 'RUNNING job lost provider operation context during restart.',
        updatedAt: now,
      };
    }

    return job;
  }
}

class PaidJobJournal {
  constructor(journalPath) {
    this.journalPath = journalPath;
    this.pendingAppend = Promise.resolve();
  }

  async append(entry) {
    const record = {
      ...entry,
      timestamp: entry.timestamp || Date.now(),
    };
    const line = JSON.stringify(record) + '\n';
    const write = this.pendingAppend
      .catch(() => {})
      .then(async () => {
        await fs.promises.mkdir(path.dirname(this.journalPath), { recursive: true });
        await fs.promises.appendFile(this.journalPath, line, 'utf8');
        return record;
      });
    this.pendingAppend = write;
    return write;
  }

  async readAll() {
    try {
      const content = await fs.promises.readFile(this.journalPath, 'utf8');
      return content
        .split('\n')
        .filter((l) => l.trim().length > 0)
        .map((l) => JSON.parse(l));
    } catch (err) {
      if (err.code === 'ENOENT') return [];
      throw err;
    }
  }
}

module.exports = {
  VALID_FSM_TRANSITIONS,
  PaidJobFSM,
  PaidJobJournal,
};
