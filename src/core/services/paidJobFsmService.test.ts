import { describe, it, expect, beforeEach } from 'vitest';
import { PaidJobFsmService, VALID_FSM_TRANSITIONS } from './paidJobFsmService';

describe('PaidJobFsmService', () => {
  let fsm: PaidJobFsmService;

  beforeEach(() => {
    fsm = new PaidJobFsmService();
    fsm.clear();
  });

  it('creates a job in DRAFT state', () => {
    const job = fsm.createDraft({
      id: 'job-test-1',
      prompt: 'A cinematic drone shot over a foggy pine forest at sunrise.',
      model: 'veo-3.1-fast',
      duration: 8,
      resolution: '720p',
    });

    expect(job.id).toBe('job-test-1');
    expect(job.state).toBe('DRAFT');
    expect(job.history).toHaveLength(0);
  });

  it('executes standard happy-path lifecycle transitions', () => {
    const job = fsm.createDraft({
      id: 'job-happy-1',
      prompt: 'Cyberpunk street',
      model: 'veo-3.1-fast',
    });

    // DRAFT -> QUOTED
    fsm.transition(job.id, 'QUOTED', {}, 'Cost quote calculated');
    expect(job.state).toBe('QUOTED');

    // QUOTED -> APPROVED
    fsm.transition(
      job.id,
      'APPROVED',
      {
        approvalToken: 'token-xyz-123',
        payloadHash: 'hash-abc-456',
      },
      'User authorized charge',
    );
    expect(job.state).toBe('APPROVED');

    // APPROVED -> DISPATCHING
    fsm.transition(job.id, 'DISPATCHING', { dispatchToken: 'disp-001' }, 'Submitting to API');
    expect(job.state).toBe('DISPATCHING');

    // DISPATCHING -> RUNNING
    fsm.transition(
      job.id,
      'RUNNING',
      { providerOperationId: 'operations/veo-999' },
      'Provider acknowledged operation',
    );
    expect(job.state).toBe('RUNNING');

    // RUNNING -> COMPLETED
    fsm.transition(
      job.id,
      'COMPLETED',
      { resultMediaUri: 'https://storage/result.mp4' },
      'Video downloaded and verified',
    );
    expect(job.state).toBe('COMPLETED');
    expect(job.history).toHaveLength(5);
  });

  it('rejects invalid state transitions according to FSM rules', () => {
    const job = fsm.createDraft({
      id: 'job-invalid-1',
      prompt: 'Test prompt',
      model: 'veo-3.1-fast',
    });

    // Cannot jump from DRAFT to RUNNING
    expect(() => fsm.transition(job.id, 'RUNNING')).toThrow(/Invalid FSM transition/);

    // Cannot jump from DRAFT to DISPATCHING
    expect(() => fsm.transition(job.id, 'DISPATCHING')).toThrow(/Invalid FSM transition/);
  });

  it('blocks transition to DISPATCHING without approvalToken and payloadHash', () => {
    const job = fsm.createDraft({
      id: 'job-unapproved-1',
      prompt: 'Unapproved job',
      model: 'veo-3.1-fast',
    });

    fsm.transition(job.id, 'QUOTED');
    fsm.transition(job.id, 'APPROVED'); // approved without token

    expect(() => fsm.transition(job.id, 'DISPATCHING')).toThrow(
      'Cannot transition to DISPATCHING without an approval token.',
    );
  });

  it('handles crash recovery without double dispatching', () => {
    const job = fsm.createDraft({
      id: 'job-crash-1',
      prompt: 'In flight job',
      model: 'veo-3.1-fast',
    });

    fsm.transition(job.id, 'QUOTED');
    fsm.transition(job.id, 'APPROVED', {
      approvalToken: 'app-token',
      payloadHash: 'hash-val',
    });
    fsm.transition(job.id, 'DISPATCHING', { dispatchToken: 'd-1' });

    // Crash happened while DISPATCHING before operation ID was recorded
    const recovered = fsm.recoverJobAfterCrash(job);
    expect(recovered.state).toBe('FAILED');
    expect(recovered.error).toContain('Double-dispatch prevented');
  });

  it('safely recovers to RUNNING if operation ID was durable before crash', () => {
    const job = fsm.createDraft({
      id: 'job-crash-2',
      prompt: 'In flight job with op ID',
      model: 'veo-3.1-fast',
    });

    fsm.transition(job.id, 'QUOTED');
    fsm.transition(job.id, 'APPROVED', {
      approvalToken: 'app-token',
      payloadHash: 'hash-val',
    });
    fsm.transition(job.id, 'DISPATCHING', {
      dispatchToken: 'd-2',
      providerOperationId: 'operations/veo-ack-123',
    });

    const recovered = fsm.recoverJobAfterCrash(job);
    expect(recovered.state).toBe('RUNNING');
  });

  it('allows cancellation from any active state', () => {
    for (const startState of ['DRAFT', 'QUOTED', 'APPROVED', 'DISPATCHING', 'RUNNING'] as const) {
      expect(VALID_FSM_TRANSITIONS[startState]).toContain('CANCELLED');
    }
  });
});
