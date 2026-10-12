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
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('modified');
  const [showArchived, setShowArchived] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState('');
  const [backups, setBackups] = useState<
    Array<{ id: string; projectId: string; createdAt: number; corrupt?: boolean }>
  >([]);
  const [backupProjectId, setBackupProjectId] = useState<string | null>(null);
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
  const displayedProjects = projects
    .filter(
      (project) =>
        (showArchived || project.status !== 'archived') &&
        project.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
    )
    .sort((a, b) => (sort === 'name' ? a.name.localeCompare(b.name) : b.modifiedAt - a.modifiedAt));
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
        <div className="mt-4 flex flex-wrap gap-3">
          <input
            aria-label={t('projects.search', 'Search projects')}
            placeholder={t('projects.search', 'Search projects')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="rounded border border-slate-700 bg-slate-900 px-3 py-2"
          />
          <select
            aria-label={t('projects.sort', 'Sort projects')}
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            className="rounded border border-slate-700 bg-slate-900 px-3 py-2"
          >
            <option value="modified">{t('projects.modified', 'Recently modified')}</option>
            <option value="name">{t('projects.byName', 'Name')}</option>
          </select>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(event) => {
                setShowArchived(event.target.checked);
                void useProjectStore.getState().refreshProjects();
              }}
            />
            {t('projects.showArchived', 'Show archived')}
          </label>
        </div>
        {backupProjectId && (
          <section
            aria-label={t('projects.backups', 'Automatic backups')}
            className="mt-3 rounded border border-slate-700 p-3"
          >
            <p>
              {t(
                'projects.backupVerification',
                'Checksums are verified when restoring. Recovery creates a new project.',
              )}
            </p>
            {backups.length === 0 && (
              <p>{t('projects.noBackups', 'No automatic backups available.')}</p>
            )}
            {backups.map((backup) => (
              <button
                key={backup.id}
                disabled={busy || backup.corrupt}
                className="m-1 rounded border border-slate-700 p-2"
                onClick={() =>
                  void run(async () => {
                    await projectDocumentService.restoreBackupCopy(backup.projectId, backup.id);
                    await useProjectStore.getState().refreshProjects();
                  })
                }
              >
                {backup.corrupt
                  ? t('projects.corruptBackup', 'Corrupt backup')
                  : t('projects.restoreCopy', 'Restore as copy')}{' '}
                — {new Date(backup.createdAt).toLocaleString()}
              </button>
            ))}
            <button onClick={() => setBackupProjectId(null)}>
              {t('projects.closeBackups', 'Close backups')}
            </button>
          </section>
        )}
        {error && (
          <p role="alert" className="mt-3 text-red-400">
            {error}
          </p>
        )}
        <section aria-label={t('sidebar.projects', 'Projects')} className="mt-6 grid gap-3">
          {displayedProjects.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-700 p-8 text-slate-400">
              {t('projects.empty', 'No local projects yet. Start in Create to make one.')}
            </p>
          ) : (
            displayedProjects.map((project) => (
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
                {renameId === project.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      aria-label={t('projects.newName', 'New project name')}
                      value={renameName}
                      onChange={(event) => setRenameName(event.target.value)}
                      className="rounded border border-slate-700 bg-slate-900 px-3 py-2"
                    />
                    <button
                      disabled={busy || !renameName.trim()}
                      onClick={() =>
                        void run(async () => {
                          await projectDocumentService.update(project.id, async (document) => {
                            if (!document) throw new Error('Project document not found');
                            return {
                              ...document,
                              name: renameName.trim(),
                              lastModified: Date.now(),
                            };
                          });
                          if (
                            !(await useProjectStore
                              .getState()
                              .updateProject(project.id, { name: renameName.trim() }))
                          )
                            throw new Error('Project metadata could not be renamed');
                          setRenameId(null);
                        })
                      }
                    >
                      {t('projects.saveName', 'Save name')}
                    </button>
                    <button onClick={() => setRenameId(null)}>
                      {t('projects.cancel', 'Cancel')}
                    </button>
                  </div>
                ) : (
                  <button
                    disabled={busy}
                    className="rounded border border-slate-700 px-3"
                    onClick={() => {
                      setRenameId(project.id);
                      setRenameName(project.name);
                    }}
                  >
                    {t('projects.rename', 'Rename')}
                  </button>
                )}
                <button
                  disabled={busy}
                  className="rounded border border-slate-700 px-3"
                  onClick={() =>
                    void run(async () => {
                      if (project.id === currentProjectId)
                        await projectDocumentService.save(captureCurrentProjectDocument(project));
                      const source = await projectDocumentService.load(project.id);
                      if (!source) throw new Error('Project document not found');
                      await projectDocumentService.copy(source);
                      await useProjectStore.getState().refreshProjects();
                    })
                  }
                >
                  {t('projects.duplicate', 'Duplicate')}
                </button>
                <button
                  disabled={busy || project.id === currentProjectId}
                  className="rounded border border-slate-700 px-3"
                  onClick={() =>
                    void run(async () => {
                      const success =
                        project.status === 'archived'
                          ? await useProjectStore.getState().unarchiveProject(project.id)
                          : await useProjectStore.getState().archiveProject(project.id);
                      if (!success) throw new Error('Could not change archive status');
                    })
                  }
                >
                  {project.status === 'archived'
                    ? t('projects.unarchive', 'Unarchive')
                    : t('projects.archive', 'Archive')}
                </button>
                {window.electron?.listProjectBackups && (
                  <button
                    disabled={busy}
                    className="rounded border border-slate-700 px-3"
                    onClick={() =>
                      void run(async () => {
                        setBackups(await window.electron!.listProjectBackups!(project.id));
                        setBackupProjectId(project.id);
                      })
                    }
                  >
                    {t('projects.backups', 'Automatic backups')}
                  </button>
                )}
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
