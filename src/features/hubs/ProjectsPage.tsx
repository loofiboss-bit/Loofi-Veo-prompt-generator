import { useRef, useState } from 'react';
import { usePromptStudioDraftStore } from '@core/store/usePromptStudioDraftStore';
import { projectService } from '@core/services/projectService';
import {
  importPortableProject,
  exportPortableProject,
  downloadProjectBlob,
  hydrateProjectMedia,
} from '@core/services/projectTransferService';
import { useTranslation } from 'react-i18next';

import { projectDocumentService } from '@core/services/projectDocumentService';
import {
  createEmptyProjectDocument,
  type EditorProjectDocument,
} from '@core/store/editorSessionAdapters';
import { useProjectStore } from '@core/store/useProjectStore';
import { useEditorSessionStore } from '@core/store/useEditorSessionStore';

export function ProjectsPage() {
  const { t } = useTranslation('common');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Project operation failed');
    } finally {
      setBusy(false);
    }
  };
  const createProject = async () => {
    if (!name.trim()) return;
    if (!(await usePromptStudioDraftStore.getState().flush()))
      throw new Error('Save the current Studio draft before changing projects.');
    const inventory = await projectService.createProject({ name: name.trim() });
    await projectDocumentService.save(createEmptyProjectDocument(inventory));
    await useProjectStore.getState().refreshProjects();
    await openProject(inventory.id);
    setName('');
  };
  const importProject = async (file: File) => {
    if (!(await usePromptStudioDraftStore.getState().flush()))
      throw new Error('Save the current Studio draft before changing projects.');
    const project = await importPortableProject(file);
    await useProjectStore.getState().refreshProjects();
    await openProject(project.id);
  };
  const projects = useProjectStore((state) => state.projects);
  const currentProjectId = useProjectStore((state) => state.currentProjectId);
  const setCurrentProject = useProjectStore((state) => state.setCurrentProject);
  const captureCurrentProjectDocument = useEditorSessionStore(
    (state) => state.captureCurrentProjectDocument,
  );
  const commitProjectDocument = useEditorSessionStore((state) => state.commitProjectDocument);

  const openProject = async (projectId: string) => {
    if (projectId === currentProjectId) return;
    if (!(await usePromptStudioDraftStore.getState().flush()))
      throw new Error('Save the current Studio draft before changing projects.');

    const currentProject = projects.find((project) => project.id === currentProjectId);
    if (currentProject) {
      await projectDocumentService.save(
        captureCurrentProjectDocument({ id: currentProject.id, name: currentProject.name }),
      );
    }

    const project = useProjectStore
      .getState()
      .projects.find((candidate) => candidate.id === projectId);
    if (!project) return;

    let document: EditorProjectDocument | null = await projectDocumentService.load(projectId);
    if (!document) {
      document = createEmptyProjectDocument({ id: project.id, name: project.name });
      await projectDocumentService.save(document);
    }

    await hydrateProjectMedia(document);
    if (await setCurrentProject(project.id)) {
      commitProjectDocument(document, 'load');
    }
  };

  return (
    <section className="creator-page min-h-full px-4 py-5 text-slate-100 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="creator-page-header border-b border-slate-800 pb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-300">
            {t('projects.libraryEyebrow', 'Project library')}
          </p>
          <h1 className="mt-1 text-2xl font-semibold">{t('sidebar.projects', 'Projects')}</h1>
          <p className="mt-2 text-sm text-slate-400">
            {t(
              'projects.consolidatedDescription',
              'Open local projects. History and reusable templates stay with their project context.',
            )}
          </p>
        </header>
        <div
          role="group"
          aria-label={t('projects.actions', 'Project actions')}
          className="creator-toolbar mt-4 flex flex-wrap items-center gap-2"
        >
          <input
            aria-label={t('projects.name', 'Project name')}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 sm:max-w-sm"
          />
          <button
            disabled={busy || !name.trim()}
            onClick={() => void run(createProject)}
            className="rounded bg-blue-600 px-3 py-2"
          >
            {t('projects.create', 'Create project')}
          </button>
          <button
            disabled={busy}
            onClick={() => input.current?.click()}
            className="rounded border border-slate-700 px-3 py-2"
          >
            {t('projects.import', 'Import project')}
          </button>
          <input
            ref={input}
            type="file"
            accept=".loofi-project"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void run(() => importProject(file));
              event.target.value = '';
            }}
          />
        </div>
        {error && (
          <p role="alert" className="mt-3 text-red-400">
            {error}
          </p>
        )}
        <section aria-label={t('sidebar.projects', 'Projects')} className="mt-6 grid gap-3">
          {projects.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-700 p-8 text-slate-400">
              {t('projects.empty', 'No local projects yet. Start in Create to make one.')}
            </p>
          ) : (
            projects.map((project) => (
              <div key={project.id} className="flex flex-wrap gap-2">
                <button
                  disabled={busy}
                  type="button"
                  aria-current={project.id === currentProjectId ? 'true' : undefined}
                  onClick={() => void run(() => openProject(project.id))}
                  className={`min-w-0 flex-1 rounded-lg border bg-slate-900 p-4 text-left hover:border-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${project.id === currentProjectId ? 'border-blue-400' : 'border-slate-800'}`}
                >
                  <span className="font-semibold">{project.name}</span>
                  <span className="mt-1 block text-xs text-slate-400">
                    {project.id === currentProjectId
                      ? t('projects.current', 'Current project')
                      : t('projects.open', 'Open project')}
                  </span>
                </button>
                <button
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      if (!(await usePromptStudioDraftStore.getState().flush()))
                        throw new Error('Save the current Studio draft before changing projects.');
                      if (project.id === currentProjectId)
                        await projectDocumentService.save(captureCurrentProjectDocument(project));
                      downloadProjectBlob(
                        await exportPortableProject(project.id),
                        `${project.name}.loofi-project`,
                      );
                    })
                  }
                  className="rounded border border-slate-700 px-3"
                >
                  {t('projects.export', 'Export project')}
                </button>
              </div>
            ))
          )}
        </section>
      </div>
    </section>
  );
}
