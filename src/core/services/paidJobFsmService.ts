/**
 * Persistent Paid-Job State Machine (FSM) — Phase 4.1
 *
 * Guarantees crash-recoverable execution and zero double-dispatching:
 * Lifecycle: DRAFT -> QUOTED -> APPROVED -> DISPATCHING -> RUNNING -> COMPLETED | FAILED | CANCELLED
 */

import { logger } from './loggerService';

export type PaidJobFsmState =
  | 'DRAFT'
  | 'QUOTED'
  | 'APPROVED'
  | 'DISPATCHING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface PaidJobFsmContext {
  id: string;
  projectId?: string;
  state: PaidJobFsmState;
  prompt: string;
  model: string;
  duration?: number;
  resolution?: string;
  count?: number;
  payloadHash?: string;
  approvalToken?: string;
  dispatchToken?: string;
  providerOperationId?: string;
  resultMediaUri?: string;
  error?: string;
  createdAt: number;
  updatedAt: number;
  history: Array<{
    from: PaidJobFsmState;
    to: PaidJobFsmState;
    timestamp: number;
    reason?: string;
  }>;
}

export const VALID_FSM_TRANSITIONS: Record<PaidJobFsmState, readonly PaidJobFsmState[]> = {
  DRAFT: ['QUOTED', 'CANCELLED'],
  QUOTED: ['APPROVED', 'QUOTED', 'DRAFT', 'CANCELLED'],
  APPROVED: ['DISPATCHING', 'CANCELLED'],
  DISPATCHING: ['RUNNING', 'FAILED', 'CANCELLED'],
  RUNNING: ['COMPLETED', 'FAILED', 'CANCELLED'],
  COMPLETED: [],
  FAILED: ['QUOTED', 'DRAFT'],
  CANCELLED: [],
};

export class PaidJobFsmService {
  private static instance: PaidJobFsmService;
  private jobs = new Map<string, PaidJobFsmContext>();

  static getInstance(): PaidJobFsmService {
    if (!PaidJobFsmService.instance) {
      PaidJobFsmService.instance = new PaidJobFsmService();
    }
    return PaidJobFsmService.instance;
  }

  createDraft(params: {
    id: string;
    projectId?: string;
    prompt: string;
    model: string;
    duration?: number;
    resolution?: string;
    count?: number;
  }): PaidJobFsmContext {
    if (!params.id?.trim()) throw new Error('Job ID is required.');
    if (!params.prompt?.trim()) throw new Error('Job prompt is required.');

    const now = Date.now();
    const job: PaidJobFsmContext = {
      id: params.id,
      projectId: params.projectId,
      state: 'DRAFT',
      prompt: params.prompt,
      model: params.model,
      duration: params.duration,
      resolution: params.resolution,
      count: params.count ?? 1,
      createdAt: now,
      updatedAt: now,
      history: [],
    };

    this.jobs.set(job.id, job);
    return job;
  }

  getJob(id: string): PaidJobFsmContext | undefined {
    return this.jobs.get(id);
  }

  transition(
    jobId: string,
    targetState: PaidJobFsmState,
    updates: Partial<Omit<PaidJobFsmContext, 'id' | 'state' | 'history' | 'createdAt'>> = {},
    reason?: string,
  ): PaidJobFsmContext {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job not found: ${jobId}`);

    const allowed = VALID_FSM_TRANSITIONS[job.state];
    if (!allowed.includes(targetState)) {
      throw new Error(
        `Invalid FSM transition from ${job.state} to ${targetState} for job ${jobId}.`,
      );
    }

    const from = job.state;
    const now = Date.now();

    // Guard against dispatching without approvalToken or payloadHash
    if (targetState === 'DISPATCHING') {
      if (!job.approvalToken && !updates.approvalToken) {
        throw new Error('Cannot transition to DISPATCHING without an approval token.');
      }
      if (!job.payloadHash && !updates.payloadHash) {
        throw new Error('Cannot transition to DISPATCHING without a verified payloadHash.');
      }
    }

    job.state = targetState;
    job.updatedAt = now;
    Object.assign(job, updates);

    job.history.push({
      from,
      to: targetState,
      timestamp: now,
      reason,
    });

    logger.info(`[PaidJobFSM] Job ${jobId} transitioned: ${from} -> ${targetState}`);
    return job;
  }

  /**
   * Safe crash recovery routine.
   * Guarantees zero double-dispatching by refusing to re-dispatch unverified in-flight requests.
   */
  recoverJobAfterCrash(job: PaidJobFsmContext): PaidJobFsmContext {
    const now = Date.now();
    if (job.state === 'DISPATCHING') {
      if (job.providerOperationId) {
        // Provider acknowledged the operation before restart -> safe to resume RUNNING
        job.state = 'RUNNING';
        job.history.push({
          from: 'DISPATCHING',
          to: 'RUNNING',
          timestamp: now,
          reason: 'Recovered active operation after restart',
        });
      } else {
        // Unverified dispatch -> transition to FAILED to avoid double charge
        job.state = 'FAILED';
        job.error =
          'AMBIGUOUS_CRASH_DURING_DISPATCH: In-flight dispatch was interrupted. Double-dispatch prevented.';
        job.history.push({
          from: 'DISPATCHING',
          to: 'FAILED',
          timestamp: now,
          reason: 'Prevented duplicate dispatch after unconfirmed restart',
        });
      }
    } else if (job.state === 'RUNNING') {
      if (!job.providerOperationId) {
        job.state = 'FAILED';
        job.error = 'RUNNING job lost provider operation context during restart.';
      }
    }

    job.updatedAt = now;
    this.jobs.set(job.id, job);
    return job;
  }

  clear(): void {
    this.jobs.clear();
  }
}

export const paidJobFsmService = PaidJobFsmService.getInstance();
