import type { PromptStudioDraftV1, Project } from '@core/types';
import type { StudioRevisionSnapshotV1, StudioRevisionV1 } from '@core/types/studioRevision';
import { createEmptyProjectDocument } from '@core/store/editorSessionAdapters';
import { projectDocumentService } from './projectDocumentService';

export function studioRevisionSnapshot(draft: PromptStudioDraftV1): StudioRevisionSnapshotV1 {
  const { projectId: _projectId, revision: _revision, updatedAt: _updatedAt, ...snapshot } = draft;
  return structuredClone(snapshot);
}

function contentKey(snapshot: StudioRevisionSnapshotV1): string {
  const normalize = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(normalize);
    if (value && typeof value === 'object')
      return Object.fromEntries(
        Object.entries(value)
          .filter(([key]) => !['createdAt', 'updatedAt', 'generatedAt'].includes(key))
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, item]) => [key, normalize(item)]),
      );
    return value;
  };
  return JSON.stringify(normalize(snapshot));
}

function appendRevision(
  revisions: StudioRevisionV1[],
  draft: PromptStudioDraftV1,
  reason: string,
): StudioRevisionV1[] {
  const snapshot = studioRevisionSnapshot(draft);
  const previous = revisions.at(-1);
  if (previous && contentKey(previous.snapshot) === contentKey(snapshot)) return revisions;
  return [
    ...revisions,
    {
      schemaVersion: 1,
      id: crypto.randomUUID(),
      projectId: draft.projectId,
      createdAt: new Date().toISOString(),
      reason,
      snapshot,
    },
  ];
}

function existingOrEmpty(project: Project | null, projectId: string): Project {
  return project ?? createEmptyProjectDocument({ id: projectId, name: projectId });
}

class StudioRevisionService {
  private static instance: StudioRevisionService;
  static getInstance(): StudioRevisionService {
    return (this.instance ??= new StudioRevisionService());
  }

  async list(projectId: string): Promise<StudioRevisionV1[]> {
    const project = await projectDocumentService.load(projectId);
    return structuredClone(project?.studioRevisions ?? []);
  }

  async checkpoint(draft: PromptStudioDraftV1, reason: string): Promise<void> {
    await projectDocumentService.update(draft.projectId, async (existing) => {
      const project = existingOrEmpty(existing, draft.projectId);
      return {
        ...project,
        studioDraft: structuredClone(draft),
        studioRevisions: appendRevision(project.studioRevisions ?? [], draft, reason),
        lastModified: Date.now(),
      };
    });
  }

  /** Save both sides of restore in one durable document transaction. */
  async restore(
    draft: PromptStudioDraftV1,
    revision: StudioRevisionV1,
  ): Promise<PromptStudioDraftV1> {
    if (revision.projectId !== draft.projectId || revision.schemaVersion !== 1)
      throw new Error('Revision belongs to another project or an unsupported schema.');
    let restored: PromptStudioDraftV1 = {
      ...structuredClone(revision.snapshot),
      projectId: draft.projectId,
      revision: draft.revision + 1,
      updatedAt: new Date().toISOString(),
    };
    await projectDocumentService.update(draft.projectId, async (existing) => {
      const project = existingOrEmpty(existing, draft.projectId);
      restored = {
        ...restored,
        revision: Math.max(draft.revision, project.studioDraft?.revision ?? 0) + 1,
      };
      const before = appendRevision(project.studioRevisions ?? [], draft, 'before-restore');
      return {
        ...project,
        studioDraft: restored,
        studioRevisions: appendRevision(before, restored, 'restore'),
        lastModified: Date.now(),
      };
    });
    return restored;
  }
}

export const studioRevisionService = StudioRevisionService.getInstance();
