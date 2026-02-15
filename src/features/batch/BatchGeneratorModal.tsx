/**
 * Batch Generator Modal
 * UI for selecting a template, filling variable matrices, and launching batch prompt generation.
 *
 * @module BatchGeneratorModal
 * @since v1.8.0
 */

import React, { useEffect, useCallback } from 'react';
import Icon from '@shared/components/ui/Icon';
import { useBatchPromptStore } from '@core/store/useBatchPromptStore';
import { useJobQueueStore } from '@core/store/useJobQueueStore';
import type { Job } from '@core/services/jobQueueService';
import type { BatchResult } from '@core/services/batchPromptService';

interface BatchGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  addToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export function BatchGeneratorModal({ isOpen, onClose, addToast }: BatchGeneratorModalProps) {
  const store = useBatchPromptStore();
  const jobQueue = useJobQueueStore();

  // Load templates when modal opens
  useEffect(() => {
    if (isOpen) {
      void store.open();
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps -- store is a new object each render; adding it causes infinite loop

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  // Watch for job completion
  useEffect(() => {
    if (!store.activeJobId) return;
    const job = jobQueue.jobs.find((j) => j.id === store.activeJobId);
    if (!job) return;

    if (job.status === 'completed') {
      const result = job.result as BatchResult | undefined;
      if (result) {
        store.setLastResult(result);
        addToast(
          `Batch complete: ${result.successCount}/${result.totalCount} prompts generated`,
          result.failedCount > 0 ? 'warning' : 'success',
        );
      }
    } else if (job.status === 'failed') {
      store.setLastResult(null);
      addToast(`Batch failed: ${job.error ?? 'Unknown error'}`, 'error');
    }
  }, [store.activeJobId, jobQueue.jobs]); // eslint-disable-line react-hooks/exhaustive-deps -- store/addToast refs change each render; only job state changes should trigger

  const handleStartBatch = useCallback(async () => {
    if (!store.selectedTemplateId) {
      addToast('Select a template first', 'info');
      return;
    }

    const filledRows = store.variableMatrix.filter((row) =>
      Object.values(row).some((v) => v.trim() !== ''),
    );
    if (filledRows.length === 0) {
      addToast('Fill in at least one variable row', 'info');
      return;
    }

    const jobId = await store.startBatch();
    if (jobId) {
      addToast(`Batch queued: ${filledRows.length} variation(s)`, 'info');
    }
  }, [store, addToast]);

  // Active job progress
  const activeJob: Job | undefined = store.activeJobId
    ? jobQueue.jobs.find((j) => j.id === store.activeJobId)
    : undefined;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-lg flex items-center justify-center z-[150] p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center shrink-0">
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Icon name="sparkles" className="w-5 h-5 text-cyan-400" />
            Batch Prompt Generator
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <Icon name="cancel" className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {/* Step 1: Template selection */}
          <section>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              1. Select Template
            </label>
            {store.isLoading ? (
              <div className="text-slate-500 text-sm">Loading templates...</div>
            ) : store.templates.length === 0 ? (
              <div className="text-slate-500 text-sm">
                No templates found. Create a template first, then use it here for batch generation.
              </div>
            ) : (
              <select
                value={store.selectedTemplateId ?? ''}
                onChange={(e) => store.selectTemplate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="" disabled>
                  Choose a template...
                </option>
                {store.templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}
          </section>

          {/* Step 2: Variable grid */}
          {store.selectedTemplateId && store.variableNames.length > 0 && (
            <section>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-slate-300">
                  2. Fill Variables ({store.variableMatrix.length} row
                  {store.variableMatrix.length !== 1 ? 's' : ''})
                </label>
                <button
                  onClick={store.addRow}
                  className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                >
                  <Icon name="plus" className="w-3.5 h-3.5" /> Add Row
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left text-slate-400 text-xs px-2 py-1 font-medium">#</th>
                      {store.variableNames.map((name) => (
                        <th
                          key={name}
                          className="text-left text-slate-400 text-xs px-2 py-1 font-medium"
                        >
                          {`{{${name}}}`}
                        </th>
                      ))}
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {store.variableMatrix.map((row, rowIdx) => (
                      <tr key={rowIdx} className="border-t border-slate-800">
                        <td className="px-2 py-1 text-slate-500 text-xs">{rowIdx + 1}</td>
                        {store.variableNames.map((name) => (
                          <td key={name} className="px-1 py-1">
                            <input
                              type="text"
                              value={row[name] ?? ''}
                              onChange={(e) => store.updateVariable(rowIdx, name, e.target.value)}
                              placeholder={name}
                              className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
                            />
                          </td>
                        ))}
                        <td className="px-1 py-1">
                          {store.variableMatrix.length > 1 && (
                            <button
                              onClick={() => store.removeRow(rowIdx)}
                              className="text-slate-500 hover:text-red-400 transition-colors"
                              aria-label={`Remove row ${rowIdx + 1}`}
                            >
                              <Icon name="cancel" className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* No variables detected */}
          {store.selectedTemplateId && store.variableNames.length === 0 && (
            <section>
              <div className="text-sm text-slate-400 bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                <p className="font-medium text-slate-300 mb-1">No variables detected</p>
                <p>
                  This template's idea field doesn't contain{' '}
                  <code className="text-cyan-400">{`{{VARIABLE}}`}</code> placeholders. Add
                  placeholders like <code className="text-cyan-400">{`{{CHARACTER}}`}</code> or{' '}
                  <code className="text-cyan-400">{`{{LOCATION}}`}</code> to enable batch
                  variations.
                </p>
              </div>
            </section>
          )}

          {/* Progress indicator */}
          {activeJob && activeJob.status === 'processing' && (
            <section>
              <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                <div className="flex justify-between text-sm text-slate-300 mb-1">
                  <span>Generating...</span>
                  <span>{activeJob.progress}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-cyan-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${activeJob.progress}%` }}
                  />
                </div>
              </div>
            </section>
          )}

          {/* Results summary */}
          {store.lastResult && (
            <section>
              <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                <h4 className="text-sm font-medium text-slate-200 mb-2">
                  Batch Results — {store.lastResult.templateName}
                </h4>
                <div className="grid grid-cols-3 gap-2 text-center text-xs mb-3">
                  <div className="bg-slate-900 rounded p-2">
                    <div className="text-lg font-bold text-slate-200">
                      {store.lastResult.totalCount}
                    </div>
                    <div className="text-slate-500">Total</div>
                  </div>
                  <div className="bg-slate-900 rounded p-2">
                    <div className="text-lg font-bold text-emerald-400">
                      {store.lastResult.successCount}
                    </div>
                    <div className="text-slate-500">Success</div>
                  </div>
                  <div className="bg-slate-900 rounded p-2">
                    <div className="text-lg font-bold text-red-400">
                      {store.lastResult.failedCount}
                    </div>
                    <div className="text-slate-500">Failed</div>
                  </div>
                </div>
                <div className="text-xs text-slate-500">
                  Completed in {(store.lastResult.durationMs / 1000).toFixed(1)}s
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 bg-slate-800/30 flex justify-end gap-3 shrink-0">
          <button
            onClick={() => {
              store.reset();
              onClose();
            }}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleStartBatch}
            disabled={!store.selectedTemplateId || activeJob?.status === 'processing'}
            className="px-5 py-2 text-sm font-medium bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            {activeJob?.status === 'processing' ? (
              <>
                <Icon name="spinner" className="w-4 h-4 animate-spin" /> Generating...
              </>
            ) : (
              <>
                <Icon name="sparkles" className="w-4 h-4" /> Generate Batch
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
