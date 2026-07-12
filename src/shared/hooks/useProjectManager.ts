import { useEffect, useRef, useState } from 'react';
import {
  Project,
  ProjectMetadata,
  PromptState,
  CharacterProfile,
  VisualDNA,
  StoryboardState,
  LocationProfile,
} from '@core/types';
import { createStore, safeDel, safeGet, safeSet } from '@core/utils/safeIdbKeyval';
import { logger } from '@core/services/loggerService';
import { snapshotComposerState } from '@core/store/editorSessionAdapters';

const META_KEY = 'veo_projects_meta';
const PROJECT_PREFIX = 'veo_project_';
const PROJECT_SNAPSHOT_STORE = createStore('veo-project-manager', 'project-snapshots');

function getProjectStorageKey(id: string): string {
  return `${PROJECT_PREFIX}${id}`;
}

function readLegacyMetadata(): ProjectMetadata[] {
  try {
    const meta = localStorage.getItem(META_KEY);
    if (!meta) {
      return [];
    }

    const parsed = JSON.parse(meta) as ProjectMetadata[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    logger.error('Failed to load project metadata', error);
    return [];
  }
}

function readLegacyProject(id: string): Project | null {
  try {
    const data = localStorage.getItem(getProjectStorageKey(id));
    if (!data) {
      return null;
    }

    return JSON.parse(data) as Project;
  } catch (error) {
    logger.error('Failed to load project data', error);
    return null;
  }
}

export const useProjectManager = () => {
  const [projectList, setProjectList] = useState<ProjectMetadata[]>([]);
  const projectsRef = useRef<Record<string, Project>>({});

  useEffect(() => {
    let isCancelled = false;

    const hydrateProjects = async () => {
      try {
        const storedMeta = await safeGet<ProjectMetadata[]>(META_KEY, PROJECT_SNAPSHOT_STORE);
        const metadata = Array.isArray(storedMeta) ? storedMeta : readLegacyMetadata();

        const hydratedProjects = await Promise.all(
          metadata.map(async (meta) => {
            const persistedProject = await safeGet<Project>(
              getProjectStorageKey(meta.id),
              PROJECT_SNAPSHOT_STORE,
            );

            const project = persistedProject ?? readLegacyProject(meta.id);

            if (project && !persistedProject) {
              await safeSet(getProjectStorageKey(meta.id), project, PROJECT_SNAPSHOT_STORE);
            }

            return project;
          }),
        );

        if (storedMeta === undefined && metadata.length > 0) {
          await safeSet(META_KEY, metadata, PROJECT_SNAPSHOT_STORE);
        }

        if (isCancelled) {
          return;
        }

        projectsRef.current = hydratedProjects.reduce<Record<string, Project>>((acc, project) => {
          if (project) {
            acc[project.id] = project;
          }
          return acc;
        }, {});
        setProjectList(metadata);
      } catch (error) {
        logger.error('Failed to hydrate project manager storage', error);
      }

      if (!isCancelled) {
        const legacyMeta = readLegacyMetadata();
        projectsRef.current = legacyMeta.reduce<Record<string, Project>>((acc, meta) => {
          const project = readLegacyProject(meta.id);
          if (project) {
            acc[project.id] = project;
          }
          return acc;
        }, {});
        setProjectList(legacyMeta);
      }
    };

    void hydrateProjects();

    return () => {
      isCancelled = true;
    };
  }, []);

  const updateMeta = (newMeta: ProjectMetadata[]) => {
    setProjectList(newMeta);
    void safeSet(META_KEY, newMeta, PROJECT_SNAPSHOT_STORE).catch((error) => {
      logger.error('Failed to persist project metadata', error);
    });
  };

  const persistProject = (project: Project) => {
    void safeSet(getProjectStorageKey(project.id), project, PROJECT_SNAPSHOT_STORE).catch(
      (error) => {
        logger.error('Failed to persist project data', error);
      },
    );
    void window.electron
      ?.saveProjectBackup?.({ projectId: project.id, snapshot: project })
      .catch((error) => logger.error('Failed to create rotating desktop project backup', error));
  };

  const createProject = (
    name: string,
    promptState: PromptState,
    characters: CharacterProfile[],
    locations: LocationProfile[],
    dnas: VisualDNA[],
    storyboard: StoryboardState,
  ): Project => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    const newProject: Project = {
      id,
      name,
      lastModified: Date.now(),
      promptState,
      characterBank: characters,
      locationBank: locations,
      visualDNA: dnas,
      storyboard,
      composer: snapshotComposerState(),
    };

    projectsRef.current = {
      ...projectsRef.current,
      [id]: newProject,
    };
    persistProject(newProject);

    const newMeta = [{ id, name, lastModified: newProject.lastModified }, ...projectList];
    updateMeta(newMeta);
    return newProject;
  };

  const saveProject = (
    id: string,
    name: string,
    promptState: PromptState,
    characters: CharacterProfile[],
    locations: LocationProfile[],
    dnas: VisualDNA[],
    storyboard: StoryboardState,
  ) => {
    const updatedProject: Project = {
      id,
      name,
      lastModified: Date.now(),
      promptState,
      characterBank: characters,
      locationBank: locations,
      visualDNA: dnas,
      storyboard,
      composer: snapshotComposerState(),
    };

    projectsRef.current = {
      ...projectsRef.current,
      [id]: updatedProject,
    };
    persistProject(updatedProject);

    // Update metadata list (move to top)
    const otherMeta = projectList.filter((p) => p.id !== id);
    const newMeta = [{ id, name, lastModified: updatedProject.lastModified }, ...otherMeta];
    updateMeta(newMeta);
  };

  const loadProject = (id: string): Project | null => {
    const cachedProject = projectsRef.current[id];
    if (cachedProject) {
      return cachedProject;
    }

    const legacyProject = readLegacyProject(id);
    if (legacyProject) {
      projectsRef.current = {
        ...projectsRef.current,
        [id]: legacyProject,
      };
      persistProject(legacyProject);
    }

    return legacyProject;
  };

  const deleteProject = (id: string) => {
    const { [id]: _deletedProject, ...remainingProjects } = projectsRef.current;
    projectsRef.current = remainingProjects;
    void safeDel(getProjectStorageKey(id), PROJECT_SNAPSHOT_STORE).catch((error) => {
      logger.error('Failed to delete project snapshot', error);
    });

    try {
      localStorage.removeItem(getProjectStorageKey(id));
    } catch (error) {
      logger.error('Failed to delete legacy project backup', error);
    }

    const newMeta = projectList.filter((p) => p.id !== id);
    updateMeta(newMeta);
  };

  const exportProject = (meta: ProjectMetadata) => {
    try {
      const project = loadProject(meta.id);
      if (!project) {
        return;
      }

      const blob = new Blob([JSON.stringify(project)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${meta.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      logger.error('Failed to export project', e);
    }
  };

  return {
    projectList,
    createProject,
    saveProject,
    loadProject,
    deleteProject,
    exportProject,
  };
};
