import { useState, useTransition } from 'react';
import { useTranslation } from 'react-i18next';
import { projectDocumentService } from '@core/services/projectDocumentService';
import { projectService } from '@core/services/projectService';
import { useEditorSessionStore } from '@core/store/useEditorSessionStore';
import { useProjectSaveStore } from '@core/store/useProjectSaveStore';
import { usePromptStudioDraftStore } from '@core/store/usePromptStudioDraftStore';
interface ProjectStatusChipProps {
  project: { id: string; name?: string };
}

export function ProjectStatusChip({ project }: ProjectStatusChipProps) {
  const { t } = useTranslation('common');
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const saveState = useProjectSaveStore((state) => state.projects[project.id]);
  const draftStatus = usePromptStudioDraftStore((state) => state.status);

  // If state is not yet tracked, default to 'saved' rather than 'unsaved' for a clean project
  const projectStatus = saveState?.status ?? 'saved';

  const isSaving = projectStatus === 'saving' || draftStatus === 'saving' || busy;
  const isConflict = projectStatus === 'conflict';
  const isError = projectStatus === 'error' || draftStatus === 'error';
  const isUnsaved = projectStatus === 'unsaved';

  const handleSave = () => {
    setBusy(true);
    startTransition(async () => {
      try {
        const session = useEditorSessionStore.getState();
        const document = session.captureCurrentProjectDocument({
          id: project.id,
          name: project.name || 'Untitled',
        });
        await projectDocumentService.save(document);
        await projectService.registerDocument(document);
        const current = useEditorSessionStore.getState().projectSnapshot;
        if (current?.id === document.id) {
          session.commitProjectDocument(
            { ...current, documentRevision: document.documentRevision },
            'save',
          );
        }
        useProjectSaveStore.getState().setStatus(project.id, { status: 'saved' });
      } catch (err) {
        useProjectSaveStore.getState().setStatus(project.id, {
          status: 'error',
          error: err instanceof Error ? err.message : String(err),
        });
      } finally {
        setBusy(false);
      }
    });
  };

  if (isConflict) {
    return (
      <span
        role="status"
        aria-live="polite"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-950/60 border border-red-800 text-red-300"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
        {t('projects.saveConflict', 'Conflicting changes')}
      </span>
    );
  }

  if (isError) {
    return (
      <span
        role="status"
        aria-live="polite"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-950/60 border border-red-800 text-red-300"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
        {t('projects.saveError', 'Save failed')}
      </span>
    );
  }

  if (isSaving) {
    return (
      <span
        role="status"
        aria-live="polite"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-950/50 border border-blue-800/80 text-blue-300"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
        {t('projects.saveSaving', 'Saving...')}
      </span>
    );
  }

  if (isUnsaved) {
    return (
      <div className="inline-flex items-center gap-1.5">
        <span
          role="status"
          aria-live="polite"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-950/40 border border-amber-800/60 text-amber-300"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          {t('projects.saveUnsaved', 'Unsaved')}
        </span>
        <button
          type="button"
          onClick={handleSave}
          disabled={busy}
          className="px-2 py-0.5 rounded-md text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer"
        >
          {t('projects.saveNow', 'Save')}
        </button>
      </div>
    );
  }

  // Saved state
  return (
    <span
      role="status"
      aria-live="polite"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-900/60 border border-slate-800 text-emerald-400/90"
      title={t('projects.allChangesSaved', 'All changes saved locally')}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      {t('projects.saveSaved', 'Saved')}
    </span>
  );
}
