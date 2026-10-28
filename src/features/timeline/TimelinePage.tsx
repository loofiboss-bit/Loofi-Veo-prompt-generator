import { defaultCreatorDelivery } from '@core/services/creatorDeliveryService';
import { EditorMediaPanel } from './EditorMediaPanel';
import { LocalTimelineEditor } from './LocalTimelineEditor';
import '@features/creator/creator.css';
import React, { Suspense, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router';

import { ROUTES } from '@core/config/routes';
import { useAppStore } from '@core/store/useAppStore';
import EmptyState from '@shared/components/EmptyState';
import { useProjectStore } from '@core/store/useProjectStore';
import { useProductionRunStore } from '@core/store/useProductionRunStore';
import { useTimelineRecoveryStore } from '@core/store/useTimelineRecoveryStore';
import { useEditorSessionStore } from '@core/store/useEditorSessionStore';
import { projectDocumentService } from '@core/services/projectDocumentService';
import { projectSaveCoordinator } from '@core/services/projectSaveCoordinator';
import {
  exportProjectOtioBundle,
  preflightProjectOtioExport,
  downloadProjectBlob,
  type MissingTimelineMedia,
} from '@core/services/projectTransferService';
import { TimelineExportRecovery } from '@shared/components/TimelineExportRecovery';

import { ErrorBoundary } from '@shared/components/ErrorBoundary';
import { ModalSkeleton } from '@shared/components/ui/Skeleton';
import TimelinePlayer from './TimelinePlayer';

const CreatorDeliveryPanel = React.lazy(() =>
  import('@features/delivery/CreatorDeliveryPanel').then((m) => ({
    default: m.CreatorDeliveryPanel,
  })),
);
const NO_MISSING_MEDIA: MissingTimelineMedia[] = [];
const captureRecoveryBinding = () => {
  const app = useAppStore.getState();
  return {
    mutationVersion: app.mutationVersion,
    clips: app.clips,
    assets: app.assets,
    shots: app.sbShots,
  };
};

export const TimelinePage: React.FC = () => {
  const { t } = useTranslation('common');
  const { t: createT } = useTranslation('create');
  const { t: creatorT } = useTranslation('creator');
  const location = useLocation();
  const deliveryMode = useEditorSessionStore(
    (state) => state.projectSnapshot?.creatorDelivery?.editorMode === 'delivery',
  );
  const projectId = useProjectStore((state) => state.currentProjectId) ?? 'default';
  const projectName =
    useProjectStore((state) => state.projects.find((project) => project.id === projectId)?.name) ??
    createT('labels.currentProject');
  const activeRun = useProductionRunStore((state) => state.activeRun);
  const run = activeRun?.projectId === projectId ? activeRun : null;
  const clips = useAppStore((state) => state.clips);
  const assets = useAppStore((state) => state.assets);
  const shots = useAppStore((state) => state.sbShots);
  const mutationVersion = useAppStore((state) => state.mutationVersion);
  const recovery = useTimelineRecoveryStore((state) => state.recovery);
  const missingMedia =
    recovery?.projectId === projectId &&
    recovery.mutationVersion === mutationVersion &&
    recovery.clips === clips &&
    recovery.assets === assets &&
    recovery.shots === shots &&
    recovery.run === run
      ? recovery.missingMedia
      : NO_MISSING_MEDIA;
  const [exporting, setExporting] = useState(false);
  const exportingRef = useRef(false);
  const [exportStatus, setExportStatus] = useState('');
  const deliveryRef = useRef<HTMLDetailsElement>(null);
  const currentProjectRef = useRef(projectId);
  currentProjectRef.current = projectId;
  useEffect(() => {
    setExportStatus('');
  }, [projectId]);
  useEffect(() => {
    if (
      (location.state as { showMediaRecovery?: boolean } | null)?.showMediaRecovery &&
      missingMedia.length
    ) {
      const recovery = document.getElementById('timeline-media-recovery');
      recovery?.scrollIntoView?.({ block: 'start' });
      recovery?.focus();
    }
  }, [location.state, missingMedia.length]);
  const recordMissingMedia = (
    missing: MissingTimelineMedia[],
    binding: ReturnType<typeof captureRecoveryBinding>,
  ) => {
    const app = useAppStore.getState();
    if (
      currentProjectRef.current !== projectId ||
      app.mutationVersion !== binding.mutationVersion ||
      app.clips !== binding.clips ||
      app.assets !== binding.assets ||
      app.sbShots !== binding.shots
    )
      throw new Error(creatorT('v16.changed', 'The edit changed. Check the delivery again.'));
    const currentRun = useProductionRunStore.getState().activeRun;
    const currentProjectRun = currentRun?.projectId === projectId ? currentRun : null;
    if (currentProjectRun !== run)
      throw new Error(creatorT('v16.changed', 'The edit changed. Check the delivery again.'));
    useTimelineRecoveryStore.getState().setRecovery({
      projectId,
      ...binding,
      run,
      missingMedia: missing,
    });
  };
  const captureSavedProject = async () => {
    await projectSaveCoordinator.saveProject(projectId);
    if (currentProjectRef.current !== projectId)
      throw new Error(creatorT('v16.changed', 'The edit changed. Check the delivery again.'));
    const saved = await projectDocumentService.load(projectId);
    if (!saved) throw new Error('Saved project document is unavailable.');
    return saved;
  };
  const handleDelivery = async () => {
    if (exportingRef.current) return;
    exportingRef.current = true;
    setExporting(true);
    setExportStatus('');
    try {
      const binding = captureRecoveryBinding();
      const saved = await captureSavedProject();
      const check = await preflightProjectOtioExport(saved, run);
      if (currentProjectRef.current !== projectId) return;
      recordMissingMedia(check.missingMedia, binding);
      if (check.missingMedia.length) return;
      const blob = await exportProjectOtioBundle(saved, run);
      if (currentProjectRef.current !== projectId) return;
      downloadProjectBlob(blob, `${projectName}.otio.zip`);
      setExportStatus(createT('messages.otioReady', 'OTIO package downloaded with local media.'));
    } catch (error) {
      if (currentProjectRef.current === projectId)
        setExportStatus(error instanceof Error ? error.message : 'OTIO export failed');
    } finally {
      exportingRef.current = false;
      setExporting(false);
    }
  };
  const handleRelink = async (entry: MissingTimelineMedia, assetId: string) => {
    const state = useAppStore.getState();
    const clip = state.clips.find((item) => item.id === entry.clipId);
    const asset = state.assets.find((item) => item.id === assetId);
    if (!clip || !asset || asset.type !== clip.type) return;
    state.updateTimelineClip(clip.id, { resourceId: asset.id, selectedTakeId: undefined });
    try {
      const binding = captureRecoveryBinding();
      const saved = await captureSavedProject();
      const check = await preflightProjectOtioExport(saved, run);
      if (currentProjectRef.current === projectId) recordMissingMedia(check.missingMedia, binding);
    } catch (error) {
      if (currentProjectRef.current === projectId)
        setExportStatus(error instanceof Error ? error.message : 'Media relink failed');
    }
  };
  const navigate = useNavigate();
  const navigationState = location.state as { returnToStudio?: 'story' } | null;
  const hasTimelineMedia = useAppStore((state) =>
    state.clips.some((clip) => clip.type === 'video' || clip.type === 'image'),
  );
  const playableShots = shots.filter((shot) => shot.generatedVideoUrl);
  const shouldReturnToStoryboard = navigationState?.returnToStudio === 'story';

  const handleExitTimeline = () => {
    if (shouldReturnToStoryboard) {
      navigate(ROUTES.HOME, { state: { reopenStudio: 'story' } });
      return;
    }

    navigate(ROUTES.HOME);
  };

  const enableDeliveryMode = () => {
    const doc = useEditorSessionStore
      .getState()
      .captureCurrentProjectDocument({ id: projectId, name: projectName });
    useEditorSessionStore.setState({
      projectSnapshot: {
        ...doc,
        creatorDelivery: {
          ...(doc.creatorDelivery ?? defaultCreatorDelivery(doc)),
          editorMode: 'delivery',
        },
      },
    });
  };
  const openDeliveryReview = () => {
    const details = deliveryRef.current;
    if (!details) return;
    details.open = true;
    const target =
      details.querySelector<HTMLButtonElement>('#delivery-review-button:not(:disabled)') ??
      details.querySelector<HTMLElement>('summary');
    target?.scrollIntoView?.({ block: 'start' });
    target?.focus();
  };

  if (!deliveryMode && playableShots.length === 0 && !hasTimelineMedia) {
    return (
      <section className="creator-page min-h-full px-4 py-5 text-slate-100 sm:px-6">
        <header className="creator-page-header mx-auto mb-4 max-w-6xl border-b border-slate-800 pb-4">
          <h1 className="text-2xl font-semibold">{t('timeline.title', 'Timeline')}</h1>
        </header>
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-center rounded-lg border border-slate-800 bg-slate-900 p-5">
          <EmptyState
            icon="🎞️"
            title={t('timeline.emptyTitle', 'Timeline is ready when you have generated clips')}
            description={creatorT(
              'timeline.emptyOwnMedia',
              'Import your own media to edit locally, or add generated clips from Production.',
            )}
            actionLabel={
              shouldReturnToStoryboard
                ? t('timeline.backToStoryboard', 'Back to Story Board')
                : t('timeline.backToStudio', 'Back to Prompt Studio')
            }
            onAction={handleExitTimeline}
            className="w-full border-none bg-transparent shadow-none"
          />
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={enableDeliveryMode}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              {creatorT('v16.openEditorMedia', 'Open editor & import media')}
            </button>
            <button
              type="button"
              onClick={() => navigate(ROUTES.CREATE)}
              className="rounded-md border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 hover:text-white"
            >
              {createT('title', 'Production Workflow')}
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="creator-page min-h-full text-slate-100">
      <header className="creator-page-header border-b border-slate-800 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">{t('timeline.title', 'Timeline')}</h1>
          <button
            type="button"
            disabled={exporting}
            onClick={() => void handleDelivery()}
            className="rounded-md border border-slate-600 px-3 py-2 text-sm disabled:opacity-50"
          >
            {createT('actions.downloadOtio', 'Download OTIO with media')}
          </button>
        </div>
        {exportStatus && (
          <p role="status" className="mt-2 text-sm">
            {exportStatus}
          </p>
        )}
        <div id="timeline-media-recovery" tabIndex={-1}>
          <TimelineExportRecovery missingMedia={missingMedia} onRelink={handleRelink} />
        </div>
      </header>
      {deliveryMode ? (
        <>
          <p className="local-editor-next">
            {hasTimelineMedia
              ? creatorT(
                  'v16.nextEdit',
                  'Next: arrange your clips, then check and review your delivery below.',
                )
              : creatorT('v16.importHint', 'Add your clips, images and music to begin.')}
          </p>
          <div className="local-editor-layout">
            <div id="timeline-media-panel" tabIndex={-1}>
              <EditorMediaPanel />
            </div>
            <ErrorBoundary panelId="local-timeline-editor">
              <LocalTimelineEditor onReviewDelivery={openDeliveryReview} />
            </ErrorBoundary>
          </div>
          <details
            id="timeline-delivery-panel"
            ref={deliveryRef}
            className="local-editor-delivery"
            open
          >
            <summary>{creatorT('v16.captionDelivery', 'Captions and delivery')}</summary>
            <ErrorBoundary panelId="creator-delivery">
              <Suspense fallback={<ModalSkeleton />}>
                <CreatorDeliveryPanel />
              </Suspense>
            </ErrorBoundary>
          </details>
        </>
      ) : (
        <>
          <TimelinePlayer embedded shots={shots} onClose={handleExitTimeline} />
          <details
            id="timeline-delivery-panel"
            ref={deliveryRef}
            className="local-editor-delivery border-t border-slate-800 mt-4 px-4"
            open
          >
            <summary className="cursor-pointer py-2 text-sm font-medium text-slate-300 hover:text-white">
              {creatorT('v16.captionDelivery', 'Captions and delivery')}
            </summary>
            <ErrorBoundary panelId="creator-delivery">
              <Suspense fallback={<ModalSkeleton />}>
                <CreatorDeliveryPanel />
              </Suspense>
            </ErrorBoundary>
          </details>
        </>
      )}
    </section>
  );
};

export default TimelinePage;
