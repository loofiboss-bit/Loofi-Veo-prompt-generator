/**
 * AppPanels Component
 * v2.9.0 — Extracted from App.tsx
 *
 * Renders lazy-loaded conditional panels: batch generator, jobs panel,
 * workspace manager, queue panel, and model fallback toast.
 */

import React from 'react';
import { ErrorBoundary } from '@shared/components/ErrorBoundary';
import { ModalSkeleton } from '@shared/components/ui/Skeleton';
import { FallbackToast } from '@shared/components/resilience/FallbackToast';

// Lazy-loaded panels
const BatchGeneratorModal = React.lazy(() =>
  import('@features/batch').then((m) => ({ default: m.BatchGeneratorModal })),
);
const JobsPanel = React.lazy(() =>
  import('@features/jobs').then((m) => ({ default: m.JobsPanel })),
);
const WorkspaceManagerModal = React.lazy(() =>
  import('@features/workspace').then((m) => ({ default: m.WorkspaceManagerModal })),
);
const QueuePanel = React.lazy(() =>
  import('@shared/components/resilience').then((m) => ({ default: m.QueuePanel })),
);

interface FallbackNotification {
  primaryModel: string;
  fallbackModel: string;
}

interface AppPanelsProps {
  isBatchModalOpen: boolean;
  onCloseBatchModal: () => void;
  addToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  isJobsPanelOpen: boolean;
  onCloseJobsPanel: () => void;
  isWorkspaceManagerOpen: boolean;
  onCloseWorkspaceManager: () => void;
  isQueuePanelOpen: boolean;
  onCloseQueuePanel: () => void;
  fallbackNotification: FallbackNotification | null;
  onDismissFallback: () => void;
}

export function AppPanels({
  isBatchModalOpen,
  onCloseBatchModal,
  addToast,
  isJobsPanelOpen,
  onCloseJobsPanel,
  isWorkspaceManagerOpen,
  onCloseWorkspaceManager,
  isQueuePanelOpen,
  onCloseQueuePanel,
  fallbackNotification,
  onDismissFallback,
}: AppPanelsProps) {
  return (
    <>
      {/* Batch Generator Modal */}
      {isBatchModalOpen && (
        <ErrorBoundary panelId="app-batch-generator-panel">
          <React.Suspense fallback={<ModalSkeleton />}>
            <BatchGeneratorModal
              isOpen={isBatchModalOpen}
              onClose={onCloseBatchModal}
              addToast={addToast}
            />
          </React.Suspense>
        </ErrorBoundary>
      )}

      {/* Background Jobs Panel */}
      {isJobsPanelOpen && (
        <ErrorBoundary panelId="app-jobs-panel">
          <React.Suspense
            fallback={
              <div className="fixed right-0 top-0 h-full z-50 shadow-2xl w-96 bg-slate-900 border-l border-slate-700 p-4">
                <ModalSkeleton />
              </div>
            }
          >
            <JobsPanel onClose={onCloseJobsPanel} />
          </React.Suspense>
        </ErrorBoundary>
      )}

      {/* Workspace Manager Modal */}
      {isWorkspaceManagerOpen && (
        <ErrorBoundary panelId="app-workspace-manager-panel">
          <React.Suspense fallback={<ModalSkeleton />}>
            <WorkspaceManagerModal
              isOpen={isWorkspaceManagerOpen}
              onClose={onCloseWorkspaceManager}
            />
          </React.Suspense>
        </ErrorBoundary>
      )}

      {/* Generation Queue Panel (v2.5.0) */}
      {isQueuePanelOpen && (
        <ErrorBoundary panelId="app-queue-panel">
          <React.Suspense
            fallback={
              <div className="fixed right-0 top-0 h-full z-50 shadow-2xl w-96 bg-slate-900 border-l border-slate-700 p-4">
                <ModalSkeleton />
              </div>
            }
          >
            <QueuePanel isOpen={isQueuePanelOpen} onClose={onCloseQueuePanel} />
          </React.Suspense>
        </ErrorBoundary>
      )}

      {/* Model Fallback Toast (v2.5.0) */}
      {fallbackNotification && (
        <ErrorBoundary panelId="app-fallback-toast-panel">
          <FallbackToast
            primaryModel={fallbackNotification.primaryModel}
            fallbackModel={fallbackNotification.fallbackModel}
            onDismiss={onDismissFallback}
          />
        </ErrorBoundary>
      )}
    </>
  );
}
