import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  load: vi.fn(),
  save: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
}));
vi.mock('./projectDocumentService', () => ({ projectDocumentService: mocks }));
vi.mock('@core/store/editorSessionAdapters', () => ({ createEmptyProjectDocument: mocks.create }));
import { createPromptStudioDraft, promptStudioDraftService } from './promptStudioDraftService';

describe('promptStudioDraftService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.save.mockResolvedValue(undefined);
    mocks.update.mockImplementation(
      async (_id: string, updater: (value: unknown) => Promise<unknown>) => {
        const updated = await updater(await mocks.load());
        await mocks.save(updated);
      },
    );
  });
  it('loads a saved versioned project draft', async () => {
    const saved = createPromptStudioDraft('a');
    saved.video.idea = 'Saved';
    mocks.load.mockResolvedValue({ studioDraft: saved });
    expect(await promptStudioDraftService.load('a')).toBe(saved);
  });
  it('never imports a draft belonging to a different project', async () => {
    mocks.load.mockResolvedValue({ studioDraft: createPromptStudioDraft('b') });
    expect(await promptStudioDraftService.load('a')).toMatchObject({
      projectId: 'a',
      video: { idea: '' },
    });
  });
  it('merges draft into existing project without losing composer or future fields', async () => {
    mocks.load.mockResolvedValue({
      id: 'a',
      composer: { blocks: ['block'] },
      future: { preserved: true },
    });
    const draft = createPromptStudioDraft('a');
    await promptStudioDraftService.save(draft);
    expect(mocks.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'a',
        composer: { blocks: ['block'] },
        future: { preserved: true },
        studioDraft: draft,
      }),
    );
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it('keeps the editor revision baseline so a stale draft cannot silently overwrite another window', async () => {
    mocks.load.mockResolvedValue({ id: 'a', documentRevision: 8 });
    await promptStudioDraftService.save(createPromptStudioDraft('a'), 7);
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ documentRevision: 7 }));
  });
  it('explicitly creates the default document on first save', async () => {
    mocks.load.mockResolvedValue(null);
    mocks.create.mockReturnValue({ id: 'default', name: 'My project' });
    await promptStudioDraftService.save(createPromptStudioDraft('default'));
    expect(mocks.create).toHaveBeenCalledWith({ id: 'default', name: 'My project' });
  });
});
