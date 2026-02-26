import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ToastMessage } from '@core/types';
import { useAppOverlaysProps } from './useAppOverlaysProps';

type OverlaysHookInput = Parameters<typeof useAppOverlaysProps>[0];

function createToast(id: string): ToastMessage {
  return {
    id,
    message: `Toast ${id}`,
    type: 'info',
  };
}

describe('useAppOverlaysProps', () => {
  it('returns stable reference when inputs are unchanged', () => {
    const dismissToast = vi.fn();
    const onCloseWelcome = vi.fn();
    const closeHelpPanel = vi.fn();
    const onCloseDiagnostics = vi.fn();

    const initialArgs: OverlaysHookInput = {
      toasts: [createToast('1')],
      dismissToast,
      hasSeenWelcome: false,
      onCloseWelcome,
      showHelpPanel: false,
      closeHelpPanel,
      isDiagnosticsOpen: false,
      onCloseDiagnostics,
    };

    const { result, rerender } = renderHook<
      ReturnType<typeof useAppOverlaysProps>,
      OverlaysHookInput
    >((props) => useAppOverlaysProps(props), {
      initialProps: initialArgs,
    });

    const firstRef = result.current;
    rerender(initialArgs);

    expect(result.current).toBe(firstRef);
  });

  it('updates reference when tracked overlay state changes', () => {
    const dismissToast = vi.fn();
    const onCloseWelcome = vi.fn();
    const closeHelpPanel = vi.fn();
    const onCloseDiagnostics = vi.fn();

    const { result, rerender } = renderHook<
      ReturnType<typeof useAppOverlaysProps>,
      OverlaysHookInput
    >((props) => useAppOverlaysProps(props), {
      initialProps: {
        toasts: [createToast('1')],
        dismissToast,
        hasSeenWelcome: true,
        onCloseWelcome,
        showHelpPanel: false,
        closeHelpPanel,
        isDiagnosticsOpen: false,
        onCloseDiagnostics,
      },
    });

    const firstRef = result.current;

    rerender({
      toasts: [createToast('1')],
      dismissToast,
      hasSeenWelcome: true,
      onCloseWelcome,
      showHelpPanel: true,
      closeHelpPanel,
      helpPanelTopic: 'camera',
      helpPanelCategory: 'composition',
      isDiagnosticsOpen: true,
      onCloseDiagnostics,
    });

    expect(result.current).not.toBe(firstRef);
    expect(result.current.showHelpPanel).toBe(true);
    expect(result.current.isDiagnosticsOpen).toBe(true);
  });

  it('updates reference when toast collection changes', () => {
    const dismissToast = vi.fn();
    const onCloseWelcome = vi.fn();
    const closeHelpPanel = vi.fn();
    const onCloseDiagnostics = vi.fn();

    const { result, rerender } = renderHook<
      ReturnType<typeof useAppOverlaysProps>,
      OverlaysHookInput
    >((props) => useAppOverlaysProps(props), {
      initialProps: {
        toasts: [createToast('1')],
        dismissToast,
        hasSeenWelcome: true,
        onCloseWelcome,
        showHelpPanel: false,
        closeHelpPanel,
        isDiagnosticsOpen: false,
        onCloseDiagnostics,
      },
    });

    const firstRef = result.current;

    rerender({
      toasts: [createToast('1'), createToast('2')],
      dismissToast,
      hasSeenWelcome: true,
      onCloseWelcome,
      showHelpPanel: false,
      closeHelpPanel,
      isDiagnosticsOpen: false,
      onCloseDiagnostics,
    });

    expect(result.current).not.toBe(firstRef);
    expect(result.current.toasts).toHaveLength(2);
  });
});
