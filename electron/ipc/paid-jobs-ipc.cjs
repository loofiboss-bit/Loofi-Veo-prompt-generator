'use strict';

const { randomUUID } = require('crypto');
const { validatePaidTask } = require('../paid-job-engine.cjs');
const { calculateMaximumCharge } = require('../paid-job-pricing.cjs');
const { validatePaidTaskInput } = require('./ipc-validator.cjs');
const { createPaidSubmission, computePaidSubmissionHash } = require('../paid-job-submission.cjs');

function registerPaidJobsIpc({ ipcMain, getEngine, dialog, getMainWindow }) {
  const pendingSubmissions = new Map();

  async function authorizePaidTask(input) {
    const task = structuredClone(input);
    // Renderer/legacy tokens are quotes, never an authorization to send this snapshot.
    task.costApproval = { ...task.costApproval };
    delete task.costApproval.payloadHash;
    delete task.costApproval.hashVersion;
    validatePaidTask(task);
    const maximumChargeUsd = calculateMaximumCharge(task);
    const approvedSubmission = createPaidSubmission(task);
    const payloadHash = computePaidSubmissionHash(approvedSubmission);
    const parameters =
      task.jobKind === 'music'
        ? `${task.request.responseFormat} · ${task.request.images.length} image references`
        : `${task.request.durationSeconds}s · ${task.request.aspectRatio} · ${task.request.resolution}`;
    const result = await dialog.showMessageBox(getMainWindow(), {
      type: 'warning',
      buttons: ['Approve maximum', 'Cancel'],
      defaultId: 1,
      cancelId: 1,
      noLink: true,
      title: 'Approve paid generation job',
      message: `Approve a maximum charge of $${maximumChargeUsd.toFixed(6)} USD?`,
      detail: `${task.request.modelId} · ${task.jobKind === 'music' ? 'music' : 'video'}\n${parameters}\n\n${task.request.prompt}\n\nVerified ${task.costApproval.verifiedDate}. This approval applies only to this exact request.`,
    });
    if (result.response !== 0) throw new Error('Paid job execution was not approved.');
    return {
      ...task,
      approvedSubmission,
      costApproval: {
        ...task.costApproval,
        approvalId: randomUUID(),
        approvedAt: Date.now(),
        payloadHash,
        hashVersion: 2,
      },
    };
  }

  ipcMain.handle('paid-job-submit', async (_, input) => {
    validatePaidTaskInput(input);
    const task = structuredClone(input);
    const engine = getEngine();
    if (!engine) throw new Error('Paid job engine is not ready.');
    if (pendingSubmissions.has(task.id)) return pendingSubmissions.get(task.id);
    const submission = (async () => {
      const existing = await engine.store.get(task.id);
      if (existing) return existing;
      return engine.submit(await authorizePaidTask(task));
    })().finally(() => pendingSubmissions.delete(task.id));
    pendingSubmissions.set(task.id, submission);
    return submission;
  });

  ipcMain.handle('paid-job-list', async () => getEngine()?.store.readAll() ?? []);
  ipcMain.handle('paid-job-cancel', async (_, id) => getEngine()?.cancel(id) ?? false);
  ipcMain.handle('paid-job-recover', async (_, context) => {
    const engine = getEngine();
    if (!engine || !context || typeof context.id !== 'string') return false;
    const job = await engine.store.get(context.id);
    if (
      !job ||
      !job.providerOperationName ||
      !['Error', 'RecoveryRequired', 'MediaAtRisk'].includes(job.status) ||
      job.productionRunId !== context.runId ||
      job.productionShotId !== context.shotId ||
      job.productionTakeId !== context.takeId
    )
      return false;
    return engine.retry(job.id);
  });
  ipcMain.handle('paid-job-retry', async (_, id) => {
    const engine = getEngine();
    if (!engine) return false;
    const job = await engine.store.get(id);
    if (!job || !['Error', 'RecoveryRequired', 'MediaAtRisk'].includes(job.status)) return false;
    if (job.providerOperationName) return engine.retry(id);
    if (job.status !== 'Error' || job.providerInteractionId) return false;
    const approved = await authorizePaidTask(job);
    return engine.retry(id, approved.costApproval, approved.approvedSubmission);
  });
}

module.exports = { registerPaidJobsIpc };
