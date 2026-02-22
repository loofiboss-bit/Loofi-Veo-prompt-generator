import React from 'react';
import { useTranslation } from 'react-i18next';

import { ErrorBoundary } from '@shared/components/ErrorBoundary';
import { ModalSkeleton } from '@shared/components/ui/Skeleton';

// Lazy-loaded collaboration panels — only rendered when opened (v2.2.0 bundle reduction)
const AssetLibrary = React.lazy(() => import('@features/prompt/AssetLibrary'));
const OptimizePanel = React.lazy(() =>
  import('@features/optimization').then((m) => ({ default: m.OptimizePanel })),
);
const ShareDialog = React.lazy(() =>
  import('@features/collaboration').then((m) => ({ default: m.ShareDialog })),
);
const ConflictResolutionPanel = React.lazy(() =>
  import('@features/collaboration').then((m) => ({ default: m.ConflictResolutionPanel })),
);
const ProfileSetup = React.lazy(() =>
  import('@features/collaboration').then((m) => ({ default: m.ProfileSetup })),
);
const CommentPanel = React.lazy(() =>
  import('@features/collaboration').then((m) => ({ default: m.CommentPanel })),
);
const RoleManager = React.lazy(() =>
  import('@features/collaboration').then((m) => ({ default: m.RoleManager })),
);

export interface AppCollaborationPanelsProps {
  isOptimizePanelOpen: boolean;
  onCloseOptimizePanel: () => void;
  isShareDialogOpen: boolean;
  onCloseShareDialog: () => void;
  isProfileSetupOpen: boolean;
  onCloseProfileSetup: () => void;
  isCommentPanelOpen: boolean;
  onCloseCommentPanel: () => void;
  isRoleManagerOpen: boolean;
  onCloseRoleManager: () => void;
  currentProjectId: string | null;
  currentProjectName: string | null;
}

export function AppCollaborationPanels({
  isOptimizePanelOpen,
  onCloseOptimizePanel,
  isShareDialogOpen,
  onCloseShareDialog,
  isProfileSetupOpen,
  onCloseProfileSetup,
  isCommentPanelOpen,
  onCloseCommentPanel,
  isRoleManagerOpen,
  onCloseRoleManager,
  currentProjectId,
  currentProjectName,
}: AppCollaborationPanelsProps) {
  const { t } = useTranslation(['common']);

  return (
    <>
      {/* Global Asset Library */}
      <ErrorBoundary panelId="app-asset-library-panel">
        <React.Suspense fallback={<ModalSkeleton />}>
          <AssetLibrary />
        </React.Suspense>
      </ErrorBoundary>

      {/* AI Optimize Panel (v3.4.0) — fixed right sidebar */}
      {isOptimizePanelOpen && (
        <ErrorBoundary panelId="app-optimize-panel">
          <React.Suspense
            fallback={
              <div className="fixed right-0 top-0 h-full z-50 shadow-2xl w-80 bg-slate-900 border-l border-slate-700 p-4">
                <ModalSkeleton />
              </div>
            }
          >
            <div className="fixed right-0 top-0 h-full z-50 shadow-2xl">
              <OptimizePanel
                promptId={currentProjectId || 'default'}
                onClose={onCloseOptimizePanel}
              />
            </div>
          </React.Suspense>
        </ErrorBoundary>
      )}

      {/* Share Dialog (v3.5.0) — collaboration room management */}
      <ErrorBoundary panelId="app-share-dialog">
        <React.Suspense fallback={<ModalSkeleton />}>
          {isShareDialogOpen && (
            <ShareDialog
              isOpen={isShareDialogOpen}
              onClose={onCloseShareDialog}
              projectId={currentProjectId || 'default'}
              projectName={currentProjectName || t('common:unsavedProject')}
            />
          )}
        </React.Suspense>
      </ErrorBoundary>

      {/* Conflict Resolution Panel (v3.6.0) — always-mounted, self-hidden when no conflicts */}
      <ErrorBoundary panelId="app-conflict-resolution">
        <React.Suspense fallback={<ModalSkeleton />}>
          <ConflictResolutionPanel />
        </React.Suspense>
      </ErrorBoundary>

      {/* Profile Setup (v3.6.0) — triggered on room join without profile */}
      <ErrorBoundary panelId="app-profile-setup">
        <React.Suspense fallback={<ModalSkeleton />}>
          {isProfileSetupOpen && (
            <ProfileSetup
              isOpen={isProfileSetupOpen}
              onClose={onCloseProfileSetup}
              onComplete={onCloseProfileSetup}
            />
          )}
        </React.Suspense>
      </ErrorBoundary>

      {/* Comment Panel (v3.6.0) — project-level threaded comments */}
      {isCommentPanelOpen && (
        <ErrorBoundary panelId="app-comment-panel">
          <React.Suspense
            fallback={
              <div className="fixed right-0 top-0 h-full z-50 shadow-2xl w-80 bg-slate-900 border-l border-slate-700 p-4">
                <ModalSkeleton />
              </div>
            }
          >
            <div className="fixed right-0 top-0 h-full z-50 shadow-2xl w-80 flex flex-col bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {t('common:sidebar.comments')}
                </h2>
                <button
                  onClick={onCloseCommentPanel}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  aria-label="Close comments"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <CommentPanel shotId={0} projectId={currentProjectId || 'default'} />
              </div>
            </div>
          </React.Suspense>
        </ErrorBoundary>
      )}

      {/* Role Manager (v3.6.0) — manage peer roles in active collaboration room */}
      <ErrorBoundary panelId="app-role-manager">
        <React.Suspense fallback={<ModalSkeleton />}>
          {isRoleManagerOpen && (
            <RoleManager isOpen={isRoleManagerOpen} onClose={onCloseRoleManager} />
          )}
        </React.Suspense>
      </ErrorBoundary>
    </>
  );
}
