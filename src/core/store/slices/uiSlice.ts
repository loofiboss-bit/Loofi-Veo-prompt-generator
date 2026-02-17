import { StateCreator } from 'zustand';
import { StudioType } from '@shared/hooks/useStudios';

export interface UiSlice {
  // Theme
  theme: 'dark' | 'light';
  setTheme: (mode: 'dark' | 'light') => void;
  toggleTheme: () => void;

  // Modals
  isHistoryOpen: boolean;
  isTemplatesOpen: boolean;
  isSavePresetModalOpen: boolean;
  isDNAModalOpen: boolean;
  isCharacterBankOpen: boolean;
  isLocationBankOpen: boolean;
  isProjectManagerOpen: boolean;
  isSeriesBibleOpen: boolean;
  isVariablesPanelOpen: boolean;
  isWizardOpen: boolean;
  isNewProjectWizardOpen: boolean;
  isSearchOpen: boolean;
  isVariationsOpen: boolean;
  isShortcutsOpen: boolean;

  // Active Studio (replaces local studio state)
  activeStudio: StudioType;

  // Actions
  openModal: (modal: keyof UiSlice) => void;
  closeModal: (modal: keyof UiSlice) => void;
  closeAllModals: () => void;

  openStudio: (studio: StudioType) => void;
  closeStudio: () => void;

  // Specific Setters for complex toggles if needed
  setNewProjectWizardOpen: (isOpen: boolean) => void;
}

export const createUiSlice: StateCreator<UiSlice> = (set, _get) => ({
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

  setTheme: (mode) => set({ theme: mode }),

  toggleTheme: () =>
    set((state) => {
      const newTheme = state.theme === 'dark' ? 'light' : 'dark';
      return { theme: newTheme };
    }),

  openModal: (modal) => set({ [modal]: true } as Partial<UiSlice>),
  closeModal: (modal) => set({ [modal]: false } as Partial<UiSlice>),

  setNewProjectWizardOpen: (isOpen) => set({ isNewProjectWizardOpen: isOpen }),

  closeAllModals: () =>
    set({
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
    }),

  openStudio: (studio) => set({ activeStudio: studio }),
  closeStudio: () => set({ activeStudio: null }),
});
