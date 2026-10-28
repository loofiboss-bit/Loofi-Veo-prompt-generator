import { usePromptStudioDraftStore } from '@core/store/usePromptStudioDraftStore';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { projectDocumentService } from '@core/services/projectDocumentService';
import { projectSaveCoordinator } from '@core/services/projectSaveCoordinator';
import { projectService } from '@core/services/projectService';
import { hydrateProjectMedia } from '@core/services/projectTransferService';
import { useProjectSaveStore } from '@core/store/useProjectSaveStore';
import { useProjectStore } from '@core/store/useProjectStore';
import { useEditorSessionStore } from '@core/store/useEditorSessionStore';

/** Shared persistence feedback and explicit recovery; local work survives every conflict. */
export function ProjectSaveStatus() {
  const { t } = useTranslation('common');
  const id = useProjectStore((state) => state.currentProjectId);
  const projects = useProjectStore((state) => state.projects);
  const state = useProjectSaveStore((store) => (id ? store.projects[id] : undefined));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const project = projects.find((candidate) => candidate.id === id);
  if (!project) return null;
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    } finally {
      setBusy(false);
    }
  };
  const status = state?.status ?? 'saved';
  if (
    status !== 'conflict' &&
    status !== 'error' &&
    state?.remoteRevision === undefined &&
    !state?.backupError &&
    !error
  ) {
    return null;
  }
  const labels = {
    unsaved: t('projects.saveUnsaved', 'Unsaved'),
    saving: t('projects.saveSaving', 'Saving'),
    saved: t('projects.saveSaved', 'Saved'),
    error: t('projects.saveError', 'Save failed'),
    conflict: t('projects.saveConflict', 'Conflicting changes'),
  };
  return (
    <div
      id="project-save-recovery"
      tabIndex={-1}
      className="mt-3 flex flex-wrap items-center gap-2 rounded border border-amber-700/80 bg-amber-950/30 p-2 text-sm text-amber-200"
    >
      <span role="status">{labels[status]}</span>
      <button
        disabled={busy || status === 'saving' || status === 'conflict'}
        onClick={() =>
          void run(async () => {
            await projectSaveCoordinator.saveProject(project.id);
          })
        }
        className="rounded border border-slate-600 px-2 py-1"
      >
        {t('projects.saveNow', 'Save project')}
      </button>
      {state?.remoteRevision !== undefined && (
        <span>{t('projects.remoteChange', 'Another window changed this project.')}</span>
      )}
      {status === 'conflict' && (
        <>
          <button
            disabled={busy}
            onClick={() =>
              void run(async () => {
                const document = await projectDocumentService.load(project.id);
                if (!document) throw new Error('Project document not found');
                await hydrateProjectMedia(document);
                useEditorSessionStore.getState().commitProjectDocument(document, 'load');
                await usePromptStudioDraftStore.getState().hydrate(project.id, true);
                useProjectSaveStore.getState().setStatus(project.id, { status: 'saved' });
              })
            }
            className="rounded border border-slate-600 px-2 py-1"
          >
            {t('projects.loadLatest', 'Load latest')}
          </button>
          <button
            disabled={busy}
            onClick={() =>
              void run(async () => {
                const document = useEditorSessionStore
                  .getState()
                  .captureCurrentProjectDocument(project);
                const copy = await projectDocumentService.copy({
                  ...state?.conflictDocument,
                  ...document,
                });
                await useProjectStore.getState().refreshProjects();
                await projectService.setCurrentProject(copy.id);
                useProjectStore.setState({ currentProjectId: copy.id });
                useEditorSessionStore.getState().commitProjectDocument(copy, 'load');
                await usePromptStudioDraftStore.getState().hydrate(copy.id, true);
              })
            }
            className="rounded border border-slate-600 px-2 py-1"
          >
            {t('projects.saveCopy', 'Save as copy')}
          </button>
        </>
      )}
      {state?.backupError && (
        <p role="alert">
          {t('projects.backupWarning', 'Project saved; automatic backup failed:')}{' '}
          {state.backupError}
        </p>
      )}
      {(state?.error || error) && <p role="alert">{error || state?.error}</p>}
    </div>
  );
}
