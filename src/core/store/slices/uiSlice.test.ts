/**
 * Tests for uiSlice via useAppStore.
 * Slice authors: UiSlice (createUiSlice).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAppStore } from '@core/store/useAppStore';

vi.mock('idb-keyval', () => ({
  get: vi.fn().mockResolvedValue(undefined),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
  keys: vi.fn().mockResolvedValue([]),
  createStore: vi.fn(),
}));

vi.mock('@core/services/loggerService', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const MODAL_KEYS = [
  'isHistoryOpen',
  'isTemplatesOpen',
  'isSavePresetModalOpen',
  'isDNAModalOpen',
  'isCharacterBankOpen',
  'isLocationBankOpen',
  'isProjectManagerOpen',
  'isSeriesBibleOpen',
  'isVariablesPanelOpen',
  'isWizardOpen',
  'isNewProjectWizardOpen',
  'isSearchOpen',
  'isVariationsOpen',
  'isShortcutsOpen',
] as const;

beforeEach(() => {
  // Reset all UI state to defaults before each test
  useAppStore.setState({
    theme: 'dark',
    isHistoryOpen: false,
    isTemplatesOpen: false,
    isSavePresetModalOpen: false,
    isDNAModalOpen: false,
    isCharacterBankOpen: false,
    isLocationBankOpen: false,
    isProjectManagerOpen: false,
    isSeriesBibleOpen: false,
    isVariablesPanelOpen: false,
    isWizardOpen: false,
    isNewProjectWizardOpen: false,
    isSearchOpen: false,
    isVariationsOpen: false,
    isShortcutsOpen: false,
    activeStudio: null,
  });
});

describe('uiSlice — initial state', () => {
  it('has dark theme by default', () => {
    expect(useAppStore.getState().theme).toBe('dark');
  });

  it('has all modals closed by default', () => {
    const state = useAppStore.getState();
    for (const key of MODAL_KEYS) {
      expect(state[key]).toBe(false);
    }
  });

  it('has no active studio by default', () => {
    expect(useAppStore.getState().activeStudio).toBeNull();
  });
});

describe('uiSlice — setTheme', () => {
  it('sets theme to light', () => {
    useAppStore.getState().setTheme('light');
    expect(useAppStore.getState().theme).toBe('light');
  });

  it('sets theme to dark', () => {
    useAppStore.getState().setTheme('light');
    useAppStore.getState().setTheme('dark');
    expect(useAppStore.getState().theme).toBe('dark');
  });
});

describe('uiSlice — toggleTheme', () => {
  it('toggles from dark to light', () => {
    useAppStore.getState().toggleTheme();
    expect(useAppStore.getState().theme).toBe('light');
  });

  it('toggles from light back to dark', () => {
    useAppStore.getState().toggleTheme(); // dark -> light
    useAppStore.getState().toggleTheme(); // light -> dark
    expect(useAppStore.getState().theme).toBe('dark');
  });
});

describe('uiSlice — openModal / closeModal', () => {
  it('opens a modal by key', () => {
    useAppStore.getState().openModal('isHistoryOpen');
    expect(useAppStore.getState().isHistoryOpen).toBe(true);
  });

  it('closes a modal by key', () => {
    useAppStore.getState().openModal('isTemplatesOpen');
    useAppStore.getState().closeModal('isTemplatesOpen');
    expect(useAppStore.getState().isTemplatesOpen).toBe(false);
  });

  it('can open multiple modals independently', () => {
    useAppStore.getState().openModal('isDNAModalOpen');
    useAppStore.getState().openModal('isSearchOpen');
    const state = useAppStore.getState();
    expect(state.isDNAModalOpen).toBe(true);
    expect(state.isSearchOpen).toBe(true);
    expect(state.isHistoryOpen).toBe(false);
  });

  it('closing a modal that is already closed keeps it false', () => {
    // isWizardOpen starts as false
    useAppStore.getState().closeModal('isWizardOpen');
    expect(useAppStore.getState().isWizardOpen).toBe(false);
  });
});

describe('uiSlice — closeAllModals', () => {
  it('closes every modal and resets activeStudio', () => {
    // Open several modals and a studio
    useAppStore.getState().openModal('isHistoryOpen');
    useAppStore.getState().openModal('isCharacterBankOpen');
    useAppStore.getState().openModal('isShortcutsOpen');
    useAppStore.getState().openStudio('image');

    useAppStore.getState().closeAllModals();

    const state = useAppStore.getState();
    for (const key of MODAL_KEYS) {
      expect(state[key]).toBe(false);
    }
    expect(state.activeStudio).toBeNull();
  });

  it('is safe to call when everything is already closed', () => {
    useAppStore.getState().closeAllModals();
    const state = useAppStore.getState();
    for (const key of MODAL_KEYS) {
      expect(state[key]).toBe(false);
    }
    expect(state.activeStudio).toBeNull();
  });
});

describe('uiSlice — openStudio / closeStudio', () => {
  it('opens a studio by type', () => {
    useAppStore.getState().openStudio('video');
    expect(useAppStore.getState().activeStudio).toBe('video');
  });

  it('switches studio by calling openStudio again', () => {
    useAppStore.getState().openStudio('image');
    useAppStore.getState().openStudio('suno');
    expect(useAppStore.getState().activeStudio).toBe('suno');
  });

  it('closes the active studio', () => {
    useAppStore.getState().openStudio('analysis');
    useAppStore.getState().closeStudio();
    expect(useAppStore.getState().activeStudio).toBeNull();
  });

  it('closing studio when none is open keeps null', () => {
    useAppStore.getState().closeStudio();
    expect(useAppStore.getState().activeStudio).toBeNull();
  });
});

describe('uiSlice — setNewProjectWizardOpen', () => {
  it('opens the new project wizard via dedicated setter', () => {
    useAppStore.getState().setNewProjectWizardOpen(true);
    expect(useAppStore.getState().isNewProjectWizardOpen).toBe(true);
  });

  it('closes the new project wizard via dedicated setter', () => {
    useAppStore.getState().setNewProjectWizardOpen(true);
    useAppStore.getState().setNewProjectWizardOpen(false);
    expect(useAppStore.getState().isNewProjectWizardOpen).toBe(false);
  });
});
