import type { Project, ProjectMetadata } from '@core/types';
import { createStore, safeGet, safeSet } from '@core/utils/safeIdbKeyval';

import { logger } from './loggerService';

const META_KEY = 'veo_projects_meta';
const PROJECT_PREFIX = 'veo_project_';
let projectSnapshotStore: ReturnType<typeof createStore> | undefined;

function getProjectSnapshotStore(): ReturnType<typeof createStore> {
  projectSnapshotStore ??= createStore('veo-project-manager', 'project-snapshots');
  return projectSnapshotStore;
}

function projectStorageKey(id: string): string {
  return `${PROJECT_PREFIX}${id}`;
}

function readLegacyJson<T>(key: string): T | undefined {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : undefined;
  } catch (error) {
    logger.error(`Failed to read legacy project storage key ${key}`, error);
    return undefined;
  }
}

class ProjectDocumentService {
  private static instance: ProjectDocumentService;

  static getInstance(): ProjectDocumentService {
    if (!ProjectDocumentService.instance) {
      ProjectDocumentService.instance = new ProjectDocumentService();
    }
    return ProjectDocumentService.instance;
  }

  async listMetadata(): Promise<ProjectMetadata[]> {
    const store = getProjectSnapshotStore();
    const stored = await safeGet<ProjectMetadata[]>(META_KEY, store);
    if (Array.isArray(stored)) return stored;

    const legacy = readLegacyJson<ProjectMetadata[]>(META_KEY);
    if (!Array.isArray(legacy)) return [];
    await safeSet(META_KEY, legacy, store);
    return legacy;
  }

  async load(id: string): Promise<Project | null> {
    const key = projectStorageKey(id);
    const store = getProjectSnapshotStore();
    const stored = await safeGet<Project>(key, store);
    if (stored) return stored;

    const legacy = readLegacyJson<Project>(key);
    if (!legacy) return null;
    await safeSet(key, legacy, store);
    return legacy;
  }

  async save(project: Project): Promise<void> {
    await safeSet(projectStorageKey(project.id), project, getProjectSnapshotStore());
    await window.electron?.saveProjectBackup?.({ projectId: project.id, snapshot: project });
  }
}

export const projectDocumentService = ProjectDocumentService.getInstance();
