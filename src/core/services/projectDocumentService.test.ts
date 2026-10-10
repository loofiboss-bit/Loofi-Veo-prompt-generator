import { beforeEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_STATE } from '@core/constants';
import { studioRevisionSnapshot } from './studioRevisionService';
import { createPromptStudioDraft } from './promptStudioDraftService';
import type { Project } from '@core/types';
import { compileVideoPromptArtifact } from './promptStudioService';

const mocks = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn(), atomic: vi.fn(), backup: vi.fn() }));
vi.mock('@core/utils/safeIdbKeyval', () => ({
  createStore: vi.fn(() => ({})),
  safeGet: mocks.get,
  safeSet: mocks.set,
  atomicUpdate: mocks.atomic,
}));
vi.mock('./projectService', () => ({
  projectService: { registerDocument: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock('./loggerService', () => ({ logger: { warn: vi.fn(), error: vi.fn() } }));
import { projectDocumentService, ProjectPersistenceError } from './projectDocumentService';

const project: Project = {
  id: 'a',
  name: 'Project A',
  lastModified: 1,
  promptState: INITIAL_STATE,
  characterBank: [],
  locationBank: [],
  visualDNA: [],
  productionBible: {} as Project['productionBible'],
  storyboard: {
    globalContext: { style: '', character: '', setting: '' },
    shots: [],
    timeline: { tracks: [], clips: [], zoomLevel: 20, currentTime: 0 },
  },
};

describe('projectDocumentService persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mocks.get.mockResolvedValue(undefined);
    mocks.set.mockResolvedValue({ durable: true });
    mocks.atomic.mockImplementation(
      async (key: string, updater: (current: Project | undefined) => Project) => {
        const snapshot = updater(await mocks.get(key));
        const result = await mocks.set(key, snapshot);
        if (!result.durable) throw new Error(result.error);
      },
    );
    mocks.backup.mockResolvedValue(undefined);
    Object.defineProperty(window, 'electron', {
      configurable: true,
      value: { saveProjectBackup: mocks.backup },
    });
  });
  it('rejects memory fallback and never creates a backup after a failed durable save', async () => {
    mocks.set.mockResolvedValue({ durable: false, error: 'Quota exceeded' });
    await expect(
      projectDocumentService.save({ ...project, documentRevision: 0 }),
    ).rejects.toBeInstanceOf(ProjectPersistenceError);
    expect(mocks.backup).not.toHaveBeenCalled();
    expect(mocks.set).toHaveBeenCalledTimes(1);
  });
  it('reports backup failure separately from successful durable save', async () => {
    mocks.backup.mockRejectedValue(new Error('Disk full'));
    await expect(projectDocumentService.save({ ...project, documentRevision: 0 })).resolves.toEqual(
      {
        durable: true,
        backupError: 'Disk full',
      },
    );
  });
  it('preserves unknown document data when saving a known-field snapshot', async () => {
    mocks.get.mockResolvedValue({ ...project, futureExtension: { preserved: true } });
    await projectDocumentService.save({ ...project, documentRevision: 0 });
    expect(mocks.set.mock.calls[0][1]).toMatchObject({ futureExtension: { preserved: true } });
  });
  it('retains checkpoints when an editor saves a stale history snapshot', async () => {
    const revision = {
      schemaVersion: 1 as const,
      id: 'revision-a',
      projectId: 'a',
      createdAt: '2026-10-08',
      reason: 'save',
      snapshot: studioRevisionSnapshot(createPromptStudioDraft('a')),
    };
    mocks.get.mockResolvedValue({ ...project, studioRevisions: [revision] });
    await projectDocumentService.save({ ...project, studioRevisions: [] });
    expect(mocks.set.mock.calls[0][1].studioRevisions).toEqual([revision]);
  });
  it('retains imported results and newer manual reviews across stale editor snapshots', async () => {
    const artifact = compileVideoPromptArtifact({
      idea: 'A boat on a lake',
      target: 'flow-veo',
      mode: 'text-to-video',
      aspectRatio: '16:9',
      durationSeconds: 8,
    });
    const result = {
      schemaVersion: 1 as const,
      id: 'external-a',
      projectId: 'a',
      artifactId: artifact.id,
      variantIndex: 0 as const,
      target: artifact.target,
      assetId: 'video-a',
      assetName: 'video.webm',
      mimeType: 'video/webm',
      durationSeconds: 2,
      importedAt: '2026-10-08',
      updatedAt: 2,
      sourceSnapshot: artifact,
      variantSnapshot: artifact.primary as import('@core/types').VideoPromptVariant,
      manualReview: { confirmedAt: '2026-10-08', notes: 'Reviewed', assetId: 'video-a' },
    };
    mocks.get.mockResolvedValue({ ...project, studioResults: [result] });
    await projectDocumentService.save({ ...project, studioResults: [] });
    expect(mocks.set.mock.calls[0][1].studioResults).toEqual([result]);
    await projectDocumentService.save({
      ...project,
      studioResults: [{ ...result, updatedAt: 1, manualReview: undefined }],
    });
    expect(mocks.set.mock.calls[1][1].studioResults).toEqual([result]);
    await projectDocumentService.save({
      ...project,
      studioResults: [{ ...result, updatedAt: 3, storyboardShotId: 4 }],
    });
    expect(mocks.set.mock.calls[2][1].studioResults[0].storyboardShotId).toBe(4);
  });
  it('serializes draft patches with editor saves and keeps the newest draft revision', async () => {
    let stored = { ...project, composer: { gridSize: 20 } } as Project;
    mocks.get.mockImplementation(async () => stored);
    mocks.set.mockImplementation(async (_key: string, value: Project) => {
      stored = value;
      return { durable: true };
    });
    const newDraft = createPromptStudioDraft('a');
    newDraft.revision = 5;
    const editor = projectDocumentService.save({
      ...project,
      composer: { gridSize: 36 } as Project['composer'],
    });
    const patch = projectDocumentService.update('a', async (current) => ({
      ...current!,
      studioDraft: newDraft,
    }));
    await Promise.all([editor, patch]);
    expect(stored.composer?.gridSize).toBe(36);
    await expect(
      projectDocumentService.save({ ...project, studioDraft: { ...newDraft, revision: 2 } }),
    ).rejects.toThrow('another window');
    expect(stored.studioDraft?.revision).toBe(5);
  });
  it('preserves newer delivery settings when a stale editor snapshot arrives', async () => {
    const delivery: NonNullable<Project['creatorDelivery']> = {
      schemaVersion: 1,
      revision: 4,
      aspectRatio: '9:16',
      captionsMode: 'burn-in',
      captionStyle: 'classic',
      safeMargin: 0.1,
      crops: {},
      title: 'Current delivery',
      description: '',
      updatedAt: 4,
    };
    mocks.get.mockResolvedValue({ ...project, creatorDelivery: delivery });
    await projectDocumentService.save({
      ...project,
      creatorDelivery: { ...delivery, revision: 2, title: 'Stale title' },
    });
    expect(mocks.set.mock.calls[0][1].creatorDelivery).toEqual(delivery);
    await projectDocumentService.save({ ...project, documentRevision: 0 });
    expect(mocks.set.mock.calls[1][1].creatorDelivery).toEqual(delivery);
  });
  it('rejects a stale window snapshot atomically without writing or creating a backup', async () => {
    mocks.get.mockResolvedValue({ ...project, documentRevision: 3, name: 'Other window' });
    await expect(projectDocumentService.save({ ...project, documentRevision: 2 })).rejects.toThrow(
      'another window',
    );
    expect(mocks.set).not.toHaveBeenCalled();
    expect(mocks.backup).not.toHaveBeenCalled();
  });
  it('advances a legacy revision only after durable commit', async () => {
    const snapshot = { ...project, documentRevision: undefined };
    await projectDocumentService.save(snapshot);
    expect(snapshot.documentRevision).toBe(1);
    expect(mocks.set.mock.calls[0][1].documentRevision).toBe(1);
  });
  it('rejects an older same-runtime timeline after a completed write', async () => {
    let stored: Project = { ...project, id: 'same-runtime', documentRevision: 0 };
    mocks.get.mockImplementation(async () => stored);
    mocks.set.mockImplementation(async (_key, value) => {
      stored = value;
      return { durable: true };
    });
    const old = structuredClone(stored);
    await projectDocumentService.save({ ...stored, name: 'Newer edit' });
    await expect(projectDocumentService.save(old)).rejects.toThrow('another window');
    expect(stored.name).toBe('Newer edit');
    expect(stored.documentRevision).toBe(1);
  });
  it('copies nested project bindings and revision identities while retaining durable media', async () => {
    const source = {
      ...project,
      id: 'source',
      documentRevision: 9,
      future: { projectId: 'source', storageKey: 'original-media' },
      studioRevisions: [{ id: 'revision-original', projectId: 'source' }],
    } as unknown as Project;
    const copy = await projectDocumentService.copy(source);
    expect(copy.id).not.toBe('source');
    expect(copy.documentRevision).toBe(1);
    expect(copy.studioRevisions![0].id).not.toBe('revision-original');
    expect((copy as unknown as { future: unknown }).future).toEqual({
      projectId: copy.id,
      storageKey: 'original-media',
    });
    expect(source.documentRevision).toBe(9);
    expect(source.studioRevisions![0].id).toBe('revision-original');
  });
  it('never copies an unverified native backup', async () => {
    Object.defineProperty(window, 'electron', {
      configurable: true,
      value: {
        restoreProjectBackup: vi.fn().mockResolvedValue({ verified: false, snapshot: project }),
      },
    });
    await expect(projectDocumentService.restoreBackupCopy('a', 'backup')).rejects.toThrow(
      'checksum',
    );
    expect(mocks.atomic).not.toHaveBeenCalled();
  });
});
