import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAppPanelsProps } from './useAppPanelsProps';

describe('useAppPanelsProps', () => {
  it('returns stable reference when inputs are unchanged', () => {
    const addToast = vi.fn();
    const onCloseBatchModal = vi.fn();
    const onCloseJobsPanel = vi.fn();
    const onCloseWorkspaceManager = vi.fn();
    const onCloseQueuePanel = vi.fn();
    const onDismissFallback = vi.fn();

    const initialArgs = {
      isBatchModalOpen: false,
      onCloseBatchModal,
      addToast,
      isJobsPanelOpen: false,
      onCloseJobsPanel,
      isWorkspaceManagerOpen: false,
      onCloseWorkspaceManager,
      isQueuePanelOpen: false,
      onCloseQueuePanel,
      fallbackNotification: null,
      onDismissFallback,
    } as const;

    const { result, rerender } = renderHook((props) => useAppPanelsProps(props), {
      initialProps: initialArgs,
    });

    const firstRef = result.current;
    rerender(initialArgs);

    expect(result.current).toBe(firstRef);
  });

  it('updates reference when tracked inputs change', () => {
    const addToast = vi.fn();
    const onCloseBatchModal = vi.fn();
    const onCloseJobsPanel = vi.fn();
    const onCloseWorkspaceManager = vi.fn();
    const onCloseQueuePanel = vi.fn();
    const onDismissFallback = vi.fn();

    const { result, rerender } = renderHook((props) => useAppPanelsProps(props), {
      initialProps: {
        isBatchModalOpen: false,
        onCloseBatchModal,
        addToast,
        isJobsPanelOpen: false,
        onCloseJobsPanel,
        isWorkspaceManagerOpen: false,
        onCloseWorkspaceManager,
        isQueuePanelOpen: false,
        onCloseQueuePanel,
        fallbackNotification: null,
        onDismissFallback,
      },
    });

    const firstRef = result.current;

    rerender({
      isBatchModalOpen: true,
      onCloseBatchModal,
      addToast,
      isJobsPanelOpen: false,
      onCloseJobsPanel,
      isWorkspaceManagerOpen: false,
      onCloseWorkspaceManager,
      isQueuePanelOpen: false,
      onCloseQueuePanel,
      fallbackNotification: null,
      onDismissFallback,
    });

    expect(result.current).not.toBe(firstRef);
    expect(result.current.isBatchModalOpen).toBe(true);
  });
});
