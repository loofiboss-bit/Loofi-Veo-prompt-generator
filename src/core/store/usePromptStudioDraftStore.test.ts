import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StudioRevisionV1 } from '@core/types/studioRevision';
import type { PromptArtifactV1, PromptStudioDraftV1 } from '@core/types';

const mocks = vi.hoisted(() => ({
  load: vi.fn(),
  save: vi.fn(),
  checkpoint: vi.fn(),
  restore: vi.fn(),
}));
vi.mock('@core/services/studioRevisionService', () => ({ studioRevisionService: mocks }));
vi.mock('@core/services/promptStudioDraftService', () => ({ promptStudioDraftService: mocks }));
const draft = (projectId: string): PromptStudioDraftV1 => ({
  schemaVersion: 1,
  projectId,
  mode: 'video',
  video: {
    idea: '',
    mode: 'text-to-video',
    target: 'flow-veo',
    aspectRatio: '16:9',
    durationSeconds: 8,
  },
  music: { topic: '', language: 'English' },
  artifact: null,
  selectedVariant: 0,
  lockedSections: [],
  revision: 0,
  updatedAt: '2026-10-07T00:00:00Z',
});

describe('project-owned Studio drafts', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useFakeTimers();
    mocks.load.mockImplementation(async (id: string) => draft(id));
    mocks.save.mockResolvedValue(undefined);
    mocks.checkpoint.mockResolvedValue(undefined);
  });
  afterEach(() => vi.useRealTimers());
  it('debounces edits at 500 ms and persists video, music, variants and locks', async () => {
    const { usePromptStudioDraftStore: store } = await import('./usePromptStudioDraftStore');
    await store.getState().hydrate('a');
    store.getState().updateVideo({ idea: 'Keep this' });
    store.getState().updateMusic({ lyrics: 'My verse' });
    store.getState().setSelectedVariant(2);
    store.getState().setLockedSections(['Verse 1']);
    await vi.advanceTimersByTimeAsync(499);
    expect(mocks.save).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(mocks.save).toHaveBeenCalledTimes(1);
    expect(mocks.save.mock.calls[0][0]).toMatchObject({
      projectId: 'a',
      video: { idea: 'Keep this' },
      music: { lyrics: 'My verse' },
      selectedVariant: 2,
      lockedSections: ['Verse 1'],
      revision: 4,
    });
    expect(store.getState().status).toBe('saved');
  });
  it('flushes A before loading B and restores saved A on returning', async () => {
    const snapshots = new Map<string, PromptStudioDraftV1>();
    mocks.save.mockImplementation(async (value: PromptStudioDraftV1) => {
      snapshots.set(value.projectId, structuredClone(value));
    });
    mocks.load.mockImplementation(async (id: string) => snapshots.get(id) ?? draft(id));
    const { usePromptStudioDraftStore: store } = await import('./usePromptStudioDraftStore');
    await store.getState().hydrate('a');
    store.getState().updateVideo({ idea: 'A only' });
    await store.getState().hydrate('b');
    expect(mocks.save.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.load.mock.invocationCallOrder[1],
    );
    expect(store.getState().draft?.video.idea).toBe('');
    await store.getState().hydrate('a');
    expect(store.getState().draft?.video.idea).toBe('A only');
    vi.resetModules();
    const { usePromptStudioDraftStore: reloaded } = await import('./usePromptStudioDraftStore');
    await reloaded.getState().hydrate('a');
    expect(reloaded.getState().draft?.video.idea).toBe('A only');
  });
  it('retains edited packs and variant choices independently in both modes', async () => {
    const { usePromptStudioDraftStore: store } = await import('./usePromptStudioDraftStore');
    await store.getState().hydrate('a');
    const video = { kind: 'video', id: 'edited-video' } as PromptArtifactV1;
    const music = { kind: 'music', id: 'edited-music' } as PromptArtifactV1;
    store.getState().setArtifact(video);
    store.getState().setSelectedVariant(2);
    store.getState().setMode('music');
    store.getState().setArtifact(music);
    store.getState().setSelectedVariant(1);
    store.getState().setMode('video');
    expect(store.getState().draft).toMatchObject({ artifact: video, selectedVariant: 2 });
    store.getState().setMode('music');
    expect(store.getState().draft).toMatchObject({ artifact: music, selectedVariant: 1 });
    await store.getState().flush();
    expect(mocks.save.mock.lastCall?.[0].artifacts).toEqual({ video, music });
  });
  it('blocks switching after failed saving and retains editable unsaved content', async () => {
    const { usePromptStudioDraftStore: store } = await import('./usePromptStudioDraftStore');
    await store.getState().hydrate('a');
    store.getState().updateVideo({ idea: 'Unsaved' });
    mocks.save.mockRejectedValue(new Error('Quota exceeded'));
    expect(await store.getState().hydrate('b')).toBe(false);
    expect(store.getState()).toMatchObject({
      status: 'error',
      error: 'Quota exceeded',
      draft: { projectId: 'a', video: { idea: 'Unsaved' } },
    });
    expect(mocks.load).toHaveBeenCalledTimes(1);
  });
  it('blocks destructive follow-up on failed checkpoints and retains the draft', async () => {
    const { usePromptStudioDraftStore: store } = await import('./usePromptStudioDraftStore');
    await store.getState().hydrate('a');
    store.getState().updateVideo({ idea: 'Keep edited pack' });
    mocks.checkpoint.mockRejectedValue(new Error('Quota exceeded'));
    expect(await store.getState().checkpoint('before-rebuild')).toBe(false);
    expect(store.getState().error).toBe('Quota exceeded');
    expect(store.getState().draft?.video.idea).toBe('Keep edited pack');
  });
  it('restores one atomic draft and keeps unsaved content on restore failure', async () => {
    const { usePromptStudioDraftStore: store } = await import('./usePromptStudioDraftStore');
    await store.getState().hydrate('a');
    store.getState().updateVideo({ idea: 'Before restore' });
    const restored = {
      ...draft('a'),
      video: { ...draft('a').video, idea: 'Old version' },
      revision: 2,
    };
    mocks.restore.mockResolvedValueOnce(restored);
    const revision = { schemaVersion: 1, projectId: 'a', id: 'old' } as StudioRevisionV1;
    expect(await store.getState().restoreRevision(revision)).toBe(true);
    expect(store.getState().draft).toBe(restored);
    store.getState().updateVideo({ idea: 'Keep on failure' });
    mocks.restore.mockRejectedValueOnce(new Error('Disk full'));
    expect(await store.getState().restoreRevision(revision)).toBe(false);
    expect(store.getState().draft?.video.idea).toBe('Keep on failure');
    expect(store.getState().error).toBe('Disk full');
  });
  it('rejects a checkpoint whose input changed while persistence was pending', async () => {
    let finish!: () => void;
    mocks.checkpoint.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const { usePromptStudioDraftStore: store } = await import('./usePromptStudioDraftStore');
    await store.getState().hydrate('a');
    const checkpoint = store.getState().checkpoint('before-ai');
    await vi.waitFor(() => expect(mocks.checkpoint).toHaveBeenCalled());
    store.getState().updateVideo({ idea: 'New input' });
    finish();
    expect(await checkpoint).toBe(false);
  });
  it('waits for edits made during a save before completing a flush', async () => {
    let finish!: () => void;
    mocks.save.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const { usePromptStudioDraftStore: store } = await import('./usePromptStudioDraftStore');
    await store.getState().hydrate('a');
    store.getState().updateVideo({ idea: 'First' });
    const flushing = store.getState().flush();
    store.getState().updateVideo({ idea: 'Latest' });
    finish();
    await flushing;
    expect(mocks.save).toHaveBeenCalledTimes(2);
    expect(mocks.save.mock.calls[1][0].video.idea).toBe('Latest');
    expect(store.getState().status).toBe('saved');
  });
});
