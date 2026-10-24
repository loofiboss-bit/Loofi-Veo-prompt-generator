import { act, cleanup, renderHook } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '@core/store/useAppStore';
import { useProjectStore } from '@core/store/useProjectStore';
import { useEditorSessionStore } from '@core/store/useEditorSessionStore';
import { useProjectSaveStore } from '@core/store/useProjectSaveStore';
import { createEmptyProjectDocument } from '@core/store/editorSessionAdapters';
import { useProjectAutosave } from './useProjectAutosave';
const mocks = vi.hoisted(() => ({ save: vi.fn(), register: vi.fn() }));
vi.mock('@core/services/projectDocumentService', () => ({
  projectDocumentService: { save: mocks.save },
}));
vi.mock('@core/services/projectService', () => ({
  projectService: { registerDocument: mocks.register },
}));
vi.mock('idb-keyval', () => ({
  createStore: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  keys: vi.fn().mockResolvedValue([]),
  update: vi.fn(),
}));
describe('canonical project autosave', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    vi.clearAllMocks();
    useAppStore.getState().resetAll();
    useProjectStore.setState({
      currentProjectId: 'p',
      projects: [{ id: 'p', name: 'Project' }] as ReturnType<
        typeof useProjectStore.getState
      >['projects'],
    });
    useEditorSessionStore.setState({
      projectSnapshot: createEmptyProjectDocument({ id: 'p', name: 'Project' }),
    });
    useProjectSaveStore.setState({ projects: { p: { status: 'saved' } } });
    mocks.save.mockImplementation(async (document) => {
      document.documentRevision = (document.documentRevision ?? 0) + 1;
      useProjectSaveStore.getState().setStatus('p', { status: 'saved' });
      return { durable: true };
    });
    mocks.register.mockResolvedValue(undefined);
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });
  it('protects unsaved edits on close and removes its listener on unmount', async () => {
    vi.useRealTimers();
    const added = vi.spyOn(window, 'addEventListener');
    const removed = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useProjectAutosave());
    await act(async () => {});
    const listener = added.mock.calls.find(([type]) => String(type) === 'beforeunload')![1] as (
      event: BeforeUnloadEvent,
    ) => void;
    useProjectSaveStore.getState().markDirty('p');
    expect(useProjectStore.getState().currentProjectId).toBe('p');
    expect(useProjectSaveStore.getState().projects.p.status).toBe('unsaved');
    const event = new Event('beforeunload', { cancelable: true });
    Object.defineProperty(event, 'returnValue', { writable: true, value: '' });
    expect(mocks.save).not.toHaveBeenCalled();
    listener(event as BeforeUnloadEvent);
    expect(event.defaultPrevented).toBe(true);
    expect(mocks.save).toHaveBeenCalledOnce();
    unmount();
    expect(removed).toHaveBeenCalledWith('beforeunload', listener);
    expect(removed).toHaveBeenCalledWith('pagehide', expect.any(Function));
    added.mockRestore();
    removed.mockRestore();
  });

  it('does not prevent unload when running inside Electron', async () => {
    vi.useRealTimers();
    (window as unknown as { electron: unknown }).electron = {};
    const added = vi.spyOn(window, 'addEventListener');
    const { unmount } = renderHook(() => useProjectAutosave());
    await act(async () => {});
    const listener = added.mock.calls.find(([type]) => String(type) === 'beforeunload')![1] as (
      event: BeforeUnloadEvent,
    ) => void;
    useProjectSaveStore.getState().markDirty('p');
    const event = new Event('beforeunload', { cancelable: true });
    Object.defineProperty(event, 'returnValue', { writable: true, value: '' });
    listener(event as BeforeUnloadEvent);
    expect(event.defaultPrevented).toBe(false);
    unmount();
    delete (window as unknown as { electron?: unknown }).electron;
    added.mockRestore();
  });

  it('debounces structural edits and advances only the durable revision baseline', async () => {
    const { unmount } = renderHook(() => useProjectAutosave());
    act(() =>
      useAppStore.setState({
        clips: [
          {
            id: 'clip',
            resourceId: 'media',
            type: 'video',
            trackId: 'v',
            label: 'Video',
            startTime: 0,
            duration: 2,
            offset: 0,
          },
        ],
      }),
    );
    expect(useProjectSaveStore.getState().projects.p.status).toBe('unsaved');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
    });
    expect(mocks.save).toHaveBeenCalledOnce();
    expect(useEditorSessionStore.getState().projectSnapshot?.documentRevision).toBe(1);
    expect(useAppStore.getState().clips[0].id).toBe('clip');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(useProjectSaveStore.getState().projects.p.status).toBe('saved');
    expect(mocks.save).toHaveBeenCalledOnce();
    unmount();
  });
  it('saves changed delivery settings but not revision-only baseline updates', async () => {
    const { unmount } = renderHook(() => useProjectAutosave());
    act(() => {
      const current = useEditorSessionStore.getState().projectSnapshot!;
      useEditorSessionStore.setState({
        projectSnapshot: {
          ...current,
          creatorDelivery: {
            schemaVersion: 1,
            revision: 1,
            aspectRatio: '9:16',
            captionsMode: 'sidecar',
            captionStyle: 'classic',
            safeMargin: 0.1,
            crops: {},
            title: 'Edited delivery',
            description: '',
            updatedAt: 1,
          },
        },
      });
    });
    expect(useProjectSaveStore.getState().projects.p.status).toBe('unsaved');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
    });
    expect(mocks.save).toHaveBeenCalledOnce();
    expect(mocks.save.mock.calls[0][0].creatorDelivery.title).toBe('Edited delivery');
    act(() => {
      const current = useEditorSessionStore.getState().projectSnapshot!;
      useEditorSessionStore.setState({ projectSnapshot: { ...current, documentRevision: 2 } });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(mocks.save).toHaveBeenCalledOnce();
    expect(useProjectSaveStore.getState().projects.p.status).toBe('saved');
    unmount();
  });
  it('persists a newer edit made while the previous save is still registering', async () => {
    let finishRegistration!: () => void;
    mocks.register.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishRegistration = resolve;
        }),
    );
    const { unmount } = renderHook(() => useProjectAutosave());
    act(() => useAppStore.setState({ tracks: [] }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
    });
    expect(mocks.save).toHaveBeenCalledOnce();
    act(() => {
      useAppStore.setState({
        promptState: { ...useAppStore.getState().promptState, idea: 'Newer edit' },
      });
    });
    expect(useProjectSaveStore.getState().projects.p.status).toBe('unsaved');
    await act(async () => {
      finishRegistration();
      await vi.advanceTimersByTimeAsync(700);
    });
    expect(mocks.save).toHaveBeenCalledTimes(2);
    expect(mocks.save.mock.calls[1][0].promptState.idea).toBe('Newer edit');
    expect(useAppStore.getState().promptState.idea).toBe('Newer edit');
    expect(useProjectSaveStore.getState().projects.p.status).toBe('saved');
    unmount();
  });
  it('does not write after a project switch or while conflict recovery is pending', async () => {
    const { unmount } = renderHook(() => useProjectAutosave());
    act(() => useAppStore.setState({ tracks: [] }));
    useProjectSaveStore.getState().setStatus('p', { status: 'conflict' });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
    });
    expect(mocks.save).not.toHaveBeenCalled();
    act(() => useAppStore.setState({ clips: [] }));
    useProjectStore.setState({ currentProjectId: 'other' });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
    });
    expect(mocks.save).not.toHaveBeenCalled();
    unmount();
  });
  it('does not save a clean document after hydration or a manual save supersedes a timer', async () => {
    const { unmount } = renderHook(() => useProjectAutosave());
    act(() => useAppStore.setState({ tracks: [] }));
    useProjectSaveStore.getState().setStatus('p', { status: 'saved' });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
    });
    expect(mocks.save).not.toHaveBeenCalled();
    unmount();
  });
});
