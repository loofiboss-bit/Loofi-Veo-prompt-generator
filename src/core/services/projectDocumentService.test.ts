import { beforeEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_STATE } from '@core/constants';
import { studioRevisionSnapshot } from './studioRevisionService';
import { createPromptStudioDraft } from './promptStudioDraftService';
import type { Project } from '@core/types';

const mocks = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn(), backup: vi.fn() }));
vi.mock('@core/utils/safeIdbKeyval', () => ({
  createStore: vi.fn(() => ({})),
  safeGet: mocks.get,
  safeSet: mocks.set,
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
    mocks.backup.mockResolvedValue(undefined);
    Object.defineProperty(window, 'electron', {
      configurable: true,
      value: { saveProjectBackup: mocks.backup },
    });
  });
  it('rejects memory fallback and never creates a backup after a failed durable save', async () => {
    mocks.set.mockResolvedValue({ durable: false, error: 'Quota exceeded' });
    await expect(projectDocumentService.save(project)).rejects.toBeInstanceOf(
      ProjectPersistenceError,
    );
    expect(mocks.backup).not.toHaveBeenCalled();
    expect(mocks.set).toHaveBeenCalledTimes(1);
  });
  it('reports backup failure separately from successful durable save', async () => {
    mocks.backup.mockRejectedValue(new Error('Disk full'));
    await expect(projectDocumentService.save(project)).resolves.toEqual({
      durable: true,
      backupError: 'Disk full',
    });
  });
  it('preserves unknown document data when saving a known-field snapshot', async () => {
    mocks.get.mockResolvedValue({ ...project, futureExtension: { preserved: true } });
    await projectDocumentService.save(project);
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
    await projectDocumentService.save({ ...project, studioDraft: { ...newDraft, revision: 2 } });
    expect(stored.studioDraft?.revision).toBe(5);
  });
});
