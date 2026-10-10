import { EditorMediaPanel } from './EditorMediaPanel';
import { LocalTimelineEditor } from './LocalTimelineEditor';
import '@features/creator/creator.css';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router';

import { ROUTES } from '@core/config/routes';
import { useAppStore } from '@core/store/useAppStore';
import EmptyState from '@shared/components/EmptyState';
import { useProjectStore } from '@core/store/useProjectStore';
import { useProductionRunStore } from '@core/store/useProductionRunStore';
import { useEditorSessionStore } from '@core/store/useEditorSessionStore';
import { projectDocumentService } from '@core/services/projectDocumentService';
import {
  exportProjectOtioBundle,
  preflightProjectOtioExport,
  downloadProjectBlob,
  type MissingTimelineMedia,
} from '@core/services/projectTransferService';
import { TimelineExportRecovery } from '@shared/components/TimelineExportRecovery';

import { ErrorBoundary } from '@shared/components/ErrorBoundary';
import { CreatorDeliveryPanel } from '@features/delivery/CreatorDeliveryPanel';
import TimelinePlayer from './TimelinePlayer';

export const TimelinePage: React.FC = () => {
  const { t } = useTranslation('common');
  const { t: createT } = useTranslation('create');
  const { t: creatorT } = useTranslation('creator');
  const deliveryMode = useEditorSessionStore(
    (state) => state.projectSnapshot?.creatorDelivery?.editorMode === 'delivery',
  );
  const projectId = useProjectStore((state) => state.currentProjectId) ?? 'default';
  const projectName =
    useProjectStore((state) => state.projects.find((project) => project.id === projectId)?.name) ??
    createT('labels.currentProject');
  const activeRun = useProductionRunStore((state) => state.activeRun);
  const run = activeRun?.projectId === projectId ? activeRun : null;
  const [exporting, setExporting] = useState(false);
  const exportingRef = useRef(false);
  const [exportStatus, setExportStatus] = useState('');
  const [missingMedia, setMissingMedia] = useState<MissingTimelineMedia[]>([]);
  const currentProjectRef = useRef(projectId);
  currentProjectRef.current = projectId;
  useEffect(() => {
    setMissingMedia([]);
    setExportStatus('');
  }, [projectId]);
  const captureSavedProject = async () => {
    const document = useEditorSessionStore
      .getState()
      .captureCurrentProjectDocument({ id: projectId, name: projectName });
    await projectDocumentService.save(document);
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
      const saved = await captureSavedProject();
      const check = await preflightProjectOtioExport(saved, run);
      if (currentProjectRef.current !== projectId) return;
      setMissingMedia(check.missingMedia);
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
      const saved = await captureSavedProject();
      const check = await preflightProjectOtioExport(saved, run);
      if (currentProjectRef.current === projectId) setMissingMedia(check.missingMedia);
    } catch (error) {
      if (currentProjectRef.current === projectId)
        setExportStatus(error instanceof Error ? error.message : 'Media relink failed');
    }
  };
  const location = useLocation();
  const navigate = useNavigate();
  const navigationState = location.state as { returnToStudio?: 'story' } | null;
  const shots = useAppStore((state) => state.sbShots);
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

  if (!deliveryMode && playableShots.length === 0 && !hasTimelineMedia) {
    return (
      <section className="creator-page min-h-full px-4 py-5 text-slate-100 sm:px-6">
        <header className="creator-page-header mx-auto mb-4 max-w-6xl border-b border-slate-800 pb-4">
          <h1 className="text-2xl font-semibold">{t('timeline.title', 'Timeline')}</h1>
        </header>
        <div className="mx-auto flex max-w-3xl items-center justify-center rounded-lg border border-slate-800 bg-slate-900 p-5">
          <EmptyState
            icon="🎞️"
            title={t('timeline.emptyTitle', 'Timeline is ready when you have generated clips')}
            description={t(
              'timeline.emptyDescription',
              'Generate video from your prompt or storyboard first, then return here to review timing, transitions, and export options.',
            )}
            actionLabel={
              shouldReturnToStoryboard
                ? t('timeline.backToStoryboard', 'Back to Story Board')
                : t('timeline.backToStudio', 'Back to Prompt Studio')
            }
            onAction={handleExitTimeline}
            className="w-full border-none bg-transparent shadow-none"
          />
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
        <TimelineExportRecovery missingMedia={missingMedia} onRelink={handleRelink} />
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
            <EditorMediaPanel />
            <ErrorBoundary panelId="local-timeline-editor">
              <LocalTimelineEditor />
            </ErrorBoundary>
          </div>
          <details className="local-editor-delivery" open>
            <summary>{creatorT('v16.captionDelivery', 'Captions and delivery')}</summary>
            <ErrorBoundary panelId="creator-delivery">
              <CreatorDeliveryPanel />
            </ErrorBoundary>
          </details>
        </>
      ) : (
        <>
          <ErrorBoundary panelId="creator-delivery">
            <CreatorDeliveryPanel />
          </ErrorBoundary>
          <TimelinePlayer embedded shots={shots} onClose={handleExitTimeline} />
        </>
      )}
    </section>
  );
};

export default TimelinePage;
