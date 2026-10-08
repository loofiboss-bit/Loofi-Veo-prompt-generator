import type { PromptStudioDraftV1 } from './promptStudioDraft';

/** Meaningful Studio content; the live revision remains a monotonic request epoch. */
export type StudioRevisionSnapshotV1 = Omit<
  PromptStudioDraftV1,
  'projectId' | 'revision' | 'updatedAt'
>;

export interface StudioRevisionV1 {
  schemaVersion: 1;
  id: string;
  projectId: string;
  createdAt: string;
  reason: string;
  snapshot: StudioRevisionSnapshotV1;
}
