import type { Project, ProjectMetadata } from '@core/types';
import {
  atomicUpdate,
  createStore,
  safeGet,
  safeSet,
  type PersistenceResult,
} from '@core/utils/safeIdbKeyval';

import { logger } from './loggerService';
import { useProjectSaveStore } from '@core/store/useProjectSaveStore';

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

export function cloneProjectDocument(project: Project, id: string, name: string): Project {
  const copy = structuredClone(project);
  const rebind = (value: unknown): void => {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (key === 'projectId' && child === project.id) (value as Record<string, unknown>)[key] = id;
      else rebind(child);
    }
  };
  rebind(copy);
  copy.id = id;
  copy.name = name;
  copy.documentRevision = 0;
  copy.lastModified = Date.now();
  copy.studioRevisions = copy.studioRevisions?.map((revision) => ({
    ...revision,
    id: crypto.randomUUID(),
  }));
  return copy;
}

export class ProjectPersistenceError extends Error {
  constructor(public readonly result: PersistenceResult) {
    super(result.error ?? 'Project could not be saved to persistent storage.');
    this.name = 'ProjectPersistenceError';
  }
}

export class ProjectConflictError extends Error {
  constructor(
    public readonly localDocument: Project,
    public readonly latestDocument: Project,
  ) {
    super(
      'This project changed in another window. Load the latest version or save your work as a copy.',
    );
    this.name = 'ProjectConflictError';
  }
}
export const PROJECT_SAVED_EVENT = 'creator-project-saved';

class ProjectDocumentService {
  private static instance: ProjectDocumentService;
  private writes = new Map<string, Promise<unknown>>();
  private committedRevisions = new Map<string, number>();

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
    try {
      let migrated = legacy;
      await atomicUpdate<Project>(
        key,
        (current) => {
          migrated = current ?? legacy;
          return migrated;
        },
        store,
      );
      return migrated;
    } catch (error) {
      logger.warn('Legacy project migration could not be persisted', error);
      return legacy;
    }
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
    const queuedBehindLocalWrite = this.writes.has(project.id);
    const revisionAtEnqueue = this.committedRevisions.get(project.id) ?? 0;
    const expectedRevision = project.documentRevision ?? 0;
    return this.enqueueWrite(project.id, async () => {
      // Only advance snapshots queued behind our own write. A later stale caller
      // or a revision written by another window must still fail the CAS check.
      const candidate =
        queuedBehindLocalWrite && expectedRevision === revisionAtEnqueue
          ? {
              ...project,
              documentRevision: this.committedRevisions.get(project.id) ?? expectedRevision,
            }
          : project;
      const result = await this.saveNow(candidate);
      project.documentRevision = candidate.documentRevision;
      return result;
    });
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

  /** Copies the whole document while keeping durable media references intact. */
  async copy(project: Project, name = `${project.name} (Copy)`): Promise<Project> {
    const id = crypto.randomUUID();
    const copy = cloneProjectDocument(project, id, name);
    await this.save(copy);
    const { projectService } = await import('./projectService');
    await projectService.registerDocument(copy);
    return copy;
  }

  async restoreBackupCopy(projectId: string, backupId: string): Promise<Project> {
    if (!window.electron?.restoreProjectBackup)
      throw new Error('Automatic backups require the desktop app.');
    const backup = await window.electron.restoreProjectBackup({ projectId, id: backupId });
    if (!backup.verified) throw new Error('Backup checksum verification failed.');
    return this.copy(backup.snapshot, `${backup.snapshot.name} (Recovered)`);
  }

  private async saveNow(project: Project): Promise<PersistenceResult> {
    const status = useProjectSaveStore.getState();
    status.setStatus(project.id, { status: 'saving' });
    let snapshot!: Project;
    try {
      await atomicUpdate<Project>(
        projectStorageKey(project.id),
        (stored) => {
          const existing = stored ?? readLegacyJson<Project>(projectStorageKey(project.id));
          if ((existing?.documentRevision ?? 0) !== (project.documentRevision ?? 0)) {
            throw new ProjectConflictError(project, existing!);
          }
          snapshot = {
            ...existing,
            ...project,
            documentRevision: (project.documentRevision ?? 0) + 1,
          };
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
              if (!previous || result.updatedAt > previous.updatedAt)
                results.set(result.id, result);
            }
            snapshot.studioResults = [...results.values()];
          }
          return snapshot;
        },
        getProjectSnapshotStore(),
      );
    } catch (error) {
      status.setStatus(project.id, {
        status: error instanceof ProjectConflictError ? 'conflict' : 'error',
        error: error instanceof Error ? error.message : String(error),
        conflictDocument:
          error instanceof ProjectConflictError ? structuredClone(project) : undefined,
      });
      if (error instanceof ProjectConflictError) throw error;
      throw new ProjectPersistenceError({
        durable: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    project.documentRevision = snapshot.documentRevision;
    this.committedRevisions.set(project.id, snapshot.documentRevision!);
    const result: PersistenceResult = { durable: true };
    window.dispatchEvent(
      new CustomEvent(PROJECT_SAVED_EVENT, {
        detail: { projectId: project.id, revision: snapshot.documentRevision },
      }),
    );
    try {
      await window.electron?.saveProjectBackup?.({ projectId: project.id, snapshot });
    } catch (error) {
      result.backupError = error instanceof Error ? error.message : String(error);
      logger.warn('Project saved, but desktop backup failed', result.backupError);
    }
    const latestStatus = useProjectSaveStore.getState().projects[project.id];
    status.setStatus(project.id, {
      status: latestStatus?.status === 'unsaved' ? 'unsaved' : 'saved',
      backupError: result.backupError,
    });
    return result;
  }
}

export const projectDocumentService = ProjectDocumentService.getInstance();
