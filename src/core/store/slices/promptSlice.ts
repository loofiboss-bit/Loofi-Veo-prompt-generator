import { StateCreator } from 'zustand';
import { PromptState, GlobalContext, GlobalStyle } from '@core/types';
import { INITIAL_STATE } from '@core/constants';
import { migratePromptStateTarget } from '@core/utils/videoTargetMigration';

export interface PromptSlice {
  promptState: PromptState;
  sbGlobalContext: GlobalContext;
  variables: Record<string, string>;
  seriesBible: string;
  credits: number;

  setPromptState: (
    update: Partial<PromptState> | ((prev: PromptState) => Partial<PromptState>),
    action?: 'replace',
  ) => void;
  applyTemplate: (settings: Partial<PromptState>) => void;
  setSbGlobalContext: (context: GlobalContext | ((prev: GlobalContext) => GlobalContext)) => void;
  setVariable: (key: string, value: string) => void;
  deleteVariable: (key: string) => void;
  setSeriesBible: (text: string) => void;
  deductCredits: (amount: number) => boolean;
  setGlobalStyle: (update: Partial<GlobalStyle>) => void;
}

export const createPromptSlice: StateCreator<PromptSlice> = (set, get) => ({
  promptState: INITIAL_STATE,
  sbGlobalContext: { style: '', character: '', setting: '' },
  variables: {
    HERO: 'Detective John',
    THEME: 'Cyberpunk Noir',
    LOCATION: 'Neon City',
  },
  seriesBible: '',
  credits: 100,

  setPromptState: (update, action) =>
    set((state) => {
      if (action === 'replace') {
        return { promptState: migratePromptStateTarget(update as PromptState) };
      }
      const newValues = typeof update === 'function' ? update(state.promptState) : update;
      return { promptState: migratePromptStateTarget({ ...state.promptState, ...newValues }) };
    }),

  applyTemplate: (settings) =>
    set((state) => ({
      promptState: migratePromptStateTarget({ ...state.promptState, ...settings }),
      // Side effect: update global context defaults when template applied
      sbGlobalContext: {
        style: settings.artStyle || '',
        character: state.sbGlobalContext.character,
        setting: settings.environment || '',
      },
    })),

  setSbGlobalContext: (context) =>
    set((state) => {
      const newContext = typeof context === 'function' ? context(state.sbGlobalContext) : context;
      return { sbGlobalContext: newContext };
    }),

  setVariable: (key, value) =>
    set((state) => ({ variables: { ...state.variables, [key]: value } })),
  deleteVariable: (key) =>
    set((state) => {
      const newVars = { ...state.variables };
      delete newVars[key];
      return { variables: newVars };
    }),

  setSeriesBible: (text) => set({ seriesBible: text }),

  deductCredits: (amount) => {
    const state = get();
    if (state.credits >= amount) {
      set({ credits: state.credits - amount });
      return true;
    }
    return false;
  },

  setGlobalStyle: (update) =>
    set((state) => ({
      promptState: {
        ...state.promptState,
        globalStyle: { ...state.promptState.globalStyle, ...update },
      },
    })),
});
