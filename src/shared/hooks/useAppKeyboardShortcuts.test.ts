import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, fireEvent } from '@testing-library/react';

const useHotkeysMock = vi.fn();

vi.mock('@shared/hooks/useHotkeys', () => ({
  useHotkeys: (...args: unknown[]) => useHotkeysMock(...args),
}));

import { useAppKeyboardShortcuts } from './useAppKeyboardShortcuts';

function createBaseOptions() {
  return {
    onGeneratePrompt: vi.fn(),
    isLoading: false,
    onOpenHelpPanel: vi.fn(),
    onOpenSavePresetModal: vi.fn(),
    onToggleCommandPalette: vi.fn(),
    activeStudio: null,
    modalState: {
      isHistoryOpen: false,
      isTemplatesOpen: false,
      isDNAModalOpen: false,
      isCharacterBankOpen: false,
      isLocationBankOpen: false,
      isProjectManagerOpen: false,
      isWizardOpen: false,
      isSeriesBibleOpen: false,
    },
  };
}

describe('useAppKeyboardShortcuts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers hotkeys including Ctrl+K and command palette toggle', () => {
    const options = createBaseOptions();

    renderHook(() => useAppKeyboardShortcuts(options));

    const [keyMap, isActive] = useHotkeysMock.mock.calls[0];
    expect(isActive).toBe(true);
    expect(keyMap).toHaveProperty('CTRL+K');

    keyMap['CTRL+K']();
    expect(options.onToggleCommandPalette).toHaveBeenCalledOnce();
  });

  it('disables hotkeys when a modal is open', () => {
    const options = createBaseOptions();
    options.modalState.isHistoryOpen = true;

    renderHook(() => useAppKeyboardShortcuts(options));

    const [, isActive] = useHotkeysMock.mock.calls[0];
    expect(isActive).toBe(false);
  });

  it('opens save preset modal on Ctrl+Shift+S', () => {
    const options = createBaseOptions();

    renderHook(() => useAppKeyboardShortcuts(options));

    fireEvent.keyDown(window, { key: 's', ctrlKey: true, shiftKey: true });

    expect(options.onOpenSavePresetModal).toHaveBeenCalledOnce();
  });
});
