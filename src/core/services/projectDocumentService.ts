import type { Project, ProjectMetadata } from '@core/types';
import { createStore, safeGet, safeSet, type PersistenceResult } from '@core/utils/safeIdbKeyval';

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

export class ProjectPersistenceError extends Error {
  constructor(public readonly result: PersistenceResult) {
    super(result.error ?? 'Project could not be saved to persistent storage.');
    this.name = 'ProjectPersistenceError';
  }
}

class ProjectDocumentService {
  private static instance: ProjectDocumentService;
  private writes = new Map<string, Promise<unknown>>();

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

  private enqueueWrite<T>(id: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.writes.get(id) ?? Promise.resolve();
    const pending = previous.catch(() => undefined).then(operation);
    this.writes.set(id, pending);
    void pending
      .finally(() => {
        if (this.writes.get(id) === pending) this.writes.delete(id);
      })
      .catch(() => undefined);
    return pending;
  }

  save(project: Project): Promise<PersistenceResult> {
    return this.enqueueWrite(project.id, () => this.saveNow(project));
  }

  /** Serializes document patches with editor saves to avoid stale draft snapshots. */
  update(
    id: string,
    updater: (project: Project | null) => Promise<Project>,
  ): Promise<PersistenceResult> {
    return this.enqueueWrite(id, async () => {
      const project = await updater(await this.load(id));
      if (project.id !== id) throw new Error('Project update changed its identity.');
      return this.saveNow(project);
    });
  }

  private async saveNow(project: Project): Promise<PersistenceResult> {
    const existing = await this.load(project.id);
    const snapshot: Project = { ...existing, ...project };
    // Delivery controls can save while an older editor snapshot is still pending.
    if (
      existing?.creatorDelivery &&
      existing.creatorDelivery.revision > (project.creatorDelivery?.revision ?? -1)
    ) {
      snapshot.creatorDelivery = existing.creatorDelivery;
    }
    if (
      existing?.studioDraft &&
      existing.studioDraft.revision > (project.studioDraft?.revision ?? -1)
    ) {
      snapshot.studioDraft = existing.studioDraft;
    }
    // Editor snapshots may predate a Studio checkpoint; append-only history must survive.
    if (existing?.studioRevisions) {
      const known = new Set(existing.studioRevisions.map((revision) => revision.id));
      snapshot.studioRevisions = [
        ...existing.studioRevisions,
        ...(project.studioRevisions ?? []).filter((revision) => !known.has(revision.id)),
      ];
    }
    // Result imports/reviews can finish after an editor captured its snapshot.
    // Preserve those additions and the newest revision of each result.
    if (existing?.studioResults) {
      const results = new Map(existing.studioResults.map((result) => [result.id, result]));
      for (const result of project.studioResults ?? []) {
        const previous = results.get(result.id);
        if (!previous || result.updatedAt > previous.updatedAt) results.set(result.id, result);
      }
      snapshot.studioResults = [...results.values()];
    }
    const result = await safeSet(
      projectStorageKey(project.id),
      snapshot,
      getProjectSnapshotStore(),
    );
    if (!result.durable) throw new ProjectPersistenceError(result);
    try {
      await window.electron?.saveProjectBackup?.({ projectId: project.id, snapshot });
    } catch (error) {
      result.backupError = error instanceof Error ? error.message : String(error);
      logger.warn('Project saved, but desktop backup failed', result.backupError);
    }
    return result;
  }
}

export const projectDocumentService = ProjectDocumentService.getInstance();
