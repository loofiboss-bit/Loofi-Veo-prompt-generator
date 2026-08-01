'use strict';

const { randomUUID } = require('crypto');
const { validatePaidTask } = require('../paid-job-engine.cjs');
const { calculateMaximumCharge } = require('../paid-job-pricing.cjs');

function registerPaidJobsIpc({ ipcMain, getEngine, dialog, getMainWindow }) {
  async function authorizePaidTask(task) {
    validatePaidTask(task);
    const maximumChargeUsd = calculateMaximumCharge(task);
    const result = await dialog.showMessageBox(getMainWindow(), {
      type: 'warning',
      buttons: ['Approve maximum', 'Cancel'],
      defaultId: 1,
      cancelId: 1,
      noLink: true,
      title: 'Approve paid generation job',
      message: `Approve a maximum charge of $${maximumChargeUsd.toFixed(6)} USD?`,
      detail: `${task.request.modelId} · ${task.jobKind === 'music' ? 'music' : 'video'}\nVerified ${task.costApproval.verifiedDate}. This approval applies only to this new job.`,
    });
    if (result.response !== 0) throw new Error('Paid job execution was not approved.');
    return {
      ...task,
      costApproval: {
        ...task.costApproval,
        approvalId: randomUUID(),
        approvedAt: Date.now(),
      },
    };
  }

  ipcMain.handle('paid-job-submit', async (_, task) => {
    const engine = getEngine();
    if (!engine) throw new Error('Paid job engine is not ready.');
    const existing = await engine.store.get(task?.id);
    if (existing) return existing;
    return engine.submit(await authorizePaidTask(task));
  });

  ipcMain.handle('paid-job-list', async () => getEngine()?.store.readAll() ?? []);
  ipcMain.handle('paid-job-cancel', async (_, id) => getEngine()?.cancel(id) ?? false);
  ipcMain.handle('paid-job-retry', async (_, id) => {
    const engine = getEngine();
    if (!engine) return false;
    const job = await engine.store.get(id);
    if (!job || job.status !== 'Error') return false;
    if (job.providerOperationName) return engine.retry(id);
    const approved = await authorizePaidTask(job);
    return engine.retry(id, approved.costApproval);
  });
}

module.exports = { registerPaidJobsIpc };
