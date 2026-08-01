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
  const projects = useProjectStore((state) => state.projects);
  const currentProjectId = useProjectStore((state) => state.currentProjectId);
  const setCurrentProject = useProjectStore((state) => state.setCurrentProject);
  const captureCurrentProjectDocument = useEditorSessionStore(
    (state) => state.captureCurrentProjectDocument,
  );
  const commitProjectDocument = useEditorSessionStore((state) => state.commitProjectDocument);

  const openProject = async (projectId: string) => {
    if (projectId === currentProjectId) return;

    const currentProject = projects.find((project) => project.id === currentProjectId);
    if (currentProject) {
      await projectDocumentService.save(
        captureCurrentProjectDocument({ id: currentProject.id, name: currentProject.name }),
      );
    }

    const project = projects.find((candidate) => candidate.id === projectId);
    if (!project) return;

    let document: EditorProjectDocument | null = await projectDocumentService.load(projectId);
    if (!document) {
      document = createEmptyProjectDocument({ id: project.id, name: project.name });
      await projectDocumentService.save(document);
    }

    if (await setCurrentProject(project.id)) {
      commitProjectDocument(document, 'load');
    }
  };

  return (
    <main id="main-content" className="min-h-full bg-slate-950 px-6 py-8 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <header className="border-b border-slate-800 pb-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-300">
            {t('projects.libraryEyebrow', 'Project library')}
          </p>
          <h1 className="mt-1 text-3xl font-semibold">{t('sidebar.projects', 'Projects')}</h1>
          <p className="mt-2 text-sm text-slate-400">
            {t(
              'projects.consolidatedDescription',
              'Open local projects. History and reusable templates stay with their project context.',
            )}
          </p>
        </header>
        <section aria-label={t('sidebar.projects', 'Projects')} className="mt-6 grid gap-3">
          {projects.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-700 p-8 text-slate-400">
              {t('projects.empty', 'No local projects yet. Start in Create to make one.')}
            </p>
          ) : (
            projects.map((project) => (
              <button
                key={project.id}
                type="button"
                aria-current={project.id === currentProjectId ? 'true' : undefined}
                onClick={() => void openProject(project.id)}
                className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-left hover:border-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              >
                <span className="font-semibold">{project.name}</span>
                <span className="mt-1 block text-xs text-slate-400">
                  {project.id === currentProjectId
                    ? t('projects.current', 'Current project')
                    : t('projects.open', 'Open project')}
                </span>
              </button>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
