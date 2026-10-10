import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useProjectSaveStore } from '@core/store/useProjectSaveStore';
import { useAppStore } from '@core/store/useAppStore';
import { PROJECT_SAVED_EVENT } from '@core/services/projectDocumentService';
import { useAppSync } from './useAppSync';
let channel: MockBroadcastChannel;
class MockBroadcastChannel {
  onmessage: ((event: { data: unknown }) => void) | null = null;
  postMessage = vi.fn();
  close = vi.fn();
  constructor() {
    channel = this;
  }
}
describe('project window notifications', () => {
  beforeEach(() => {
    vi.stubGlobal('BroadcastChannel', MockBroadcastChannel);
    useProjectSaveStore.setState({ projects: {} });
  });
  it('broadcasts only saved project identities and revisions', () => {
    renderHook(() => useAppSync());
    window.dispatchEvent(
      new CustomEvent(PROJECT_SAVED_EVENT, { detail: { projectId: 'a', revision: 2 } }),
    );
    expect(channel.postMessage).toHaveBeenCalledWith({
      type: 'PROJECT_CHANGED',
      projectId: 'a',
      revision: 2,
    });
  });
  it('never copies prompt content from another window', () => {
    renderHook(() => useAppSync());
    const before = useAppStore.getState().promptState;
    channel.onmessage?.({
      data: { type: 'STATE_UPDATE', payload: { description: 'Remote prompt' } },
    });
    expect(useAppStore.getState().promptState).toBe(before);
  });
  it('tracks changes separately for each project', () => {
    renderHook(() => useAppSync());
    channel.onmessage?.({ data: { type: 'PROJECT_CHANGED', projectId: 'b', revision: 4 } });
    expect(useProjectSaveStore.getState().projects.b.remoteRevision).toBe(4);
    expect(useProjectSaveStore.getState().projects.a).toBeUndefined();
  });
  it('closes the channel on unmount', () => {
    const { unmount } = renderHook(() => useAppSync());
    unmount();
    expect(channel.close).toHaveBeenCalled();
  });
});
