/**
 * JobsPanel Component
 * v1.8.0 — Workflow Automation Layer
 *
 * Sliding overlay panel that displays all background jobs (queued, processing,
 * completed, failed, cancelled). Provides cancel/retry/remove actions per job,
 * plus a "clear history" button for terminal states.
 *
 * Pattern mirrors DiagnosticsPanel (props: { onClose }).
 */

import React, { useMemo } from 'react';
import { useJobQueueStore } from '@core/store/useJobQueueStore';
import Icon from '@shared/components/ui/Icon';
import EmptyState from '@shared/components/EmptyState';
import type { Job, JobStatus, JobType } from '@core/services/jobQueueService';

// ── Props ──────────────────────────────────────────────────────────────────

interface JobsPanelProps {
  onClose: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<JobStatus, string> = {
  queued: 'Queued',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

const STATUS_CLASSES: Record<JobStatus, string> = {
  queued: 'bg-slate-500/20 text-slate-300',
  processing: 'bg-blue-500/20 text-blue-300',
  completed: 'bg-green-500/20 text-green-300',
  failed: 'bg-red-500/20 text-red-300',
  cancelled: 'bg-yellow-500/20 text-yellow-300',
};

const TYPE_EMOJI: Record<JobType, string> = {
  export: '📦',
  'batch-prompt': '⚡',
  analysis: '🔍',
  'video-generation': '🎬',
};

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatDuration(startMs: number, endMs?: number): string {
  const elapsed = (endMs ?? Date.now()) - startMs;
  if (elapsed < 1000) return `${elapsed}ms`;
  const secs = Math.round(elapsed / 1000);
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

// ── Job Row ────────────────────────────────────────────────────────────────

interface JobRowProps {
  job: Job;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
}

const JobRow: React.FC<JobRowProps> = ({ job, onCancel, onRetry, onRemove }) => {
  const isTerminal =
    job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled';

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base flex-shrink-0" aria-hidden>
            {TYPE_EMOJI[job.type]}
          </span>
          <span className="text-sm font-medium text-white truncate">{job.label}</span>
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_CLASSES[job.status]}`}
        >
          {STATUS_LABELS[job.status]}
        </span>
      </div>

      {/* Progress bar (processing only) */}
      {job.status === 'processing' && (
        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-300"
            style={{ width: `${job.progress}%` }}
          />
        </div>
      )}

      {/* Metadata row */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>
          {formatTimestamp(job.createdAt)}
          {job.startedAt && ` · ${formatDuration(job.startedAt, job.completedAt)}`}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {job.status === 'processing' && (
            <button
              onClick={() => onCancel(job.id)}
              className="p-1 rounded hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
              title="Cancel job"
            >
              <Icon name="cancel" className="w-3.5 h-3.5" />
            </button>
          )}
          {job.status === 'failed' && (
            <button
              onClick={() => onRetry(job.id)}
              className="p-1 rounded hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 transition-colors"
              title="Retry job"
            >
              <Icon name="redo" className="w-3.5 h-3.5" />
            </button>
          )}
          {isTerminal && (
            <button
              onClick={() => onRemove(job.id)}
              className="p-1 rounded hover:bg-white/10 text-slate-500 hover:text-slate-300 transition-colors"
              title="Remove from list"
            >
              <Icon name="trash" className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Error message */}
      {job.status === 'failed' && job.error && (
        <p className="text-xs text-red-400 bg-red-500/10 rounded px-2 py-1 break-words">
          {job.error}
        </p>
      )}
    </div>
  );
};

// ── Panel ──────────────────────────────────────────────────────────────────

export const JobsPanel: React.FC<JobsPanelProps> = ({ onClose }) => {
  const { jobs, cancel, retry, remove, clearHistory, pendingCount } = useJobQueueStore();

  // Sort: active first (processing > queued), then recent terminal
  const sortedJobs = useMemo(() => {
    const priority: Record<JobStatus, number> = {
      processing: 0,
      queued: 1,
      failed: 2,
      cancelled: 3,
      completed: 4,
    };
    return [...jobs].sort((a, b) => {
      const ps = priority[a.status] - priority[b.status];
      if (ps !== 0) return ps;
      return b.createdAt - a.createdAt;
    });
  }, [jobs]);

  const hasTerminalJobs = jobs.some(
    (j) => j.status === 'completed' || j.status === 'failed' || j.status === 'cancelled',
  );

  return (
    <div className="fixed inset-y-0 right-0 w-96 z-50 flex flex-col bg-slate-900 border-l border-white/10 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Icon name="list" className="w-5 h-5 text-blue-400" />
          <h2 className="text-base font-semibold text-white">Background Jobs</h2>
          {pendingCount > 0 && (
            <span className="ml-1 text-xs bg-blue-500/30 text-blue-300 px-2 py-0.5 rounded-full">
              {pendingCount} active
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          title="Close"
        >
          <Icon name="cancel" className="w-5 h-5" />
        </button>
      </div>

      {/* Job list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {sortedJobs.length === 0 ? (
          <EmptyState
            icon="OK"
            title="No background jobs"
            description="Queued and completed jobs will appear here."
            className="h-full flex items-center justify-center"
          />
        ) : (
          sortedJobs.map((job) => (
            <JobRow key={job.id} job={job} onCancel={cancel} onRetry={retry} onRemove={remove} />
          ))
        )}
      </div>

      {/* Footer */}
      {hasTerminalJobs && (
        <div className="px-4 py-3 border-t border-white/10">
          <button
            onClick={clearHistory}
            className="w-full text-sm py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            Clear completed jobs
          </button>
        </div>
      )}
    </div>
  );
};
