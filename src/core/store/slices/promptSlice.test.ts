/**
 * Tests for promptSlice via useAppStore.
 * Slice authors: PromptSlice (createPromptSlice).
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

beforeEach(() => {
  useAppStore.setState({
    variables: { HERO: 'Detective John', THEME: 'Cyberpunk Noir', LOCATION: 'Neon City' },
    seriesBible: '',
    credits: 100,
    sbGlobalContext: { style: '', character: '', setting: '' },
  });
});

describe('promptSlice — setPromptState', () => {
  it('partial update merges into promptState', () => {
    useAppStore.getState().setPromptState({ idea: 'A heist at dawn' });
    expect(useAppStore.getState().promptState.idea).toBe('A heist at dawn');
  });

  it('functional update receives current state', () => {
    useAppStore.getState().setPromptState({ idea: 'original' });
    useAppStore.getState().setPromptState((prev) => ({ idea: prev.idea + ' updated' }));
    expect(useAppStore.getState().promptState.idea).toBe('original updated');
  });

  it('replace action sets promptState directly', () => {
    const current = useAppStore.getState().promptState;
    useAppStore.getState().setPromptState({ ...current, idea: 'replaced' }, 'replace');
    expect(useAppStore.getState().promptState.idea).toBe('replaced');
  });
});

describe('promptSlice — applyTemplate', () => {
  it('merges template settings into promptState and globalContext', () => {
    useAppStore.getState().applyTemplate({ artStyle: 'noir', environment: 'cityscape' });
    const state = useAppStore.getState();
    expect(state.promptState.artStyle).toBe('noir');
    expect(state.sbGlobalContext.style).toBe('noir');
    expect(state.sbGlobalContext.setting).toBe('cityscape');
  });
});

describe('promptSlice — setSbGlobalContext', () => {
  it('sets context with a plain object', () => {
    useAppStore
      .getState()
      .setSbGlobalContext({ style: 'cinematic', character: 'hero', setting: 'lab' });
    expect(useAppStore.getState().sbGlobalContext).toEqual({
      style: 'cinematic',
      character: 'hero',
      setting: 'lab',
    });
  });

  it('sets context with a function', () => {
    useAppStore.getState().setSbGlobalContext((prev) => ({ ...prev, style: 'updated' }));
    expect(useAppStore.getState().sbGlobalContext.style).toBe('updated');
  });
});

describe('promptSlice — variables', () => {
  it('setVariable adds a new variable', () => {
    useAppStore.getState().setVariable('VILLAIN', 'Dr. X');
    expect(useAppStore.getState().variables['VILLAIN']).toBe('Dr. X');
  });

  it('setVariable updates existing variable', () => {
    useAppStore.getState().setVariable('HERO', 'Agent Smith');
    expect(useAppStore.getState().variables['HERO']).toBe('Agent Smith');
  });

  it('deleteVariable removes the key', () => {
    useAppStore.getState().deleteVariable('HERO');
    expect(useAppStore.getState().variables['HERO']).toBeUndefined();
  });
});

describe('promptSlice — seriesBible', () => {
  it('setSeriesBible updates seriesBible', () => {
    useAppStore.getState().setSeriesBible('In a world where...');
    expect(useAppStore.getState().seriesBible).toBe('In a world where...');
  });
});

describe('promptSlice — credits', () => {
  it('deductCredits succeeds when sufficient credits', () => {
    const ok = useAppStore.getState().deductCredits(30);
    expect(ok).toBe(true);
    expect(useAppStore.getState().credits).toBe(70);
  });

  it('deductCredits fails when insufficient credits', () => {
    useAppStore.setState({ credits: 10 });
    const ok = useAppStore.getState().deductCredits(50);
    expect(ok).toBe(false);
    expect(useAppStore.getState().credits).toBe(10);
  });

  it('deductCredits allows deducting exact balance', () => {
    const ok = useAppStore.getState().deductCredits(100);
    expect(ok).toBe(true);
    expect(useAppStore.getState().credits).toBe(0);
  });
});

describe('promptSlice — setGlobalStyle', () => {
  it('merges partial global style into promptState.globalStyle', () => {
    useAppStore
      .getState()
      .setGlobalStyle({ description: 'warm cinematic', strength: 80, isLocked: false });
    expect(useAppStore.getState().promptState.globalStyle?.description).toBe('warm cinematic');
    expect(useAppStore.getState().promptState.globalStyle?.strength).toBe(80);
  });
});
