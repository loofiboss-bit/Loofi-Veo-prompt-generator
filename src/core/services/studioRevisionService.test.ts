import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Project } from '@core/types';
import { createPromptStudioDraft } from './promptStudioDraftService';

const mocks = vi.hoisted(() => ({ load: vi.fn(), update: vi.fn() }));
vi.mock('./projectDocumentService', () => ({ projectDocumentService: mocks }));
vi.mock('@core/store/editorSessionAdapters', () => ({
  createEmptyProjectDocument: (identity: object) => identity,
}));
import { studioRevisionService } from './studioRevisionService';

let project: Project | null;
describe('project-owned Studio revisions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    project = null;
    mocks.load.mockImplementation(async () => project);
    mocks.update.mockImplementation(async (_id, updater) => {
      project = await updater(project);
    });
  });
  it('persists both mode packs and locks and deduplicates counter-only changes', async () => {
    const draft = createPromptStudioDraft('a');
    draft.music.lyrics = 'Locked words';
    draft.lockedSections = ['Verse'];
    draft.selectedVariants = { music: 2, video: 1 };
    await studioRevisionService.checkpoint(draft, 'save');
    await studioRevisionService.checkpoint({ ...draft, revision: 9, updatedAt: 'later' }, 'save');
    const revisions = await studioRevisionService.list('a');
    expect(revisions).toHaveLength(1);
    expect(revisions[0].snapshot).toMatchObject({
      music: { lyrics: 'Locked words' },
      lockedSections: ['Verse'],
      selectedVariants: { music: 2, video: 1 },
    });
    expect(revisions[0].snapshot).not.toHaveProperty('revision');
    expect(revisions[0].snapshot).not.toHaveProperty('updatedAt');
    draft.music.lyrics = 'Changed later';
    expect(revisions[0].snapshot.music.lyrics).toBe('Locked words');
  });
  it('restores atomically with before/after revisions and a fresh request epoch', async () => {
    const draft = createPromptStudioDraft('a');
    draft.music.lyrics = 'Original';
    draft.lockedSections = ['Verse'];
    await studioRevisionService.checkpoint(draft, 'save');
    const revision = (await studioRevisionService.list('a'))[0];
    const changed = { ...draft, music: { ...draft.music, lyrics: 'Changed' }, revision: 12 };
    const restored = await studioRevisionService.restore(changed, revision);
    expect(restored.revision).toBe(13);
    expect(restored.music.lyrics).toBe('Original');
    expect(restored.lockedSections).toEqual(['Verse']);
    expect((await studioRevisionService.list('a')).map((entry) => entry.reason)).toEqual([
      'save',
      'before-restore',
      'restore',
    ]);
    expect(project?.studioDraft).toEqual(restored);
    expect(mocks.update).toHaveBeenCalledTimes(2);
  });
  it('rejects foreign revisions and propagates durable persistence failure', async () => {
    const draft = createPromptStudioDraft('a');
    await studioRevisionService.checkpoint(draft, 'save');
    const revision = (await studioRevisionService.list('a'))[0];
    await expect(
      studioRevisionService.restore(createPromptStudioDraft('b'), revision),
    ).rejects.toThrow('another project');
    mocks.update.mockRejectedValue(new Error('Quota exceeded'));
    await expect(studioRevisionService.checkpoint(draft, 'save')).rejects.toThrow('Quota exceeded');
  });
});
