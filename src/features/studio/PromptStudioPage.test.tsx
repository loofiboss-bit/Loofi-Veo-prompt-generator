import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@/test-utils';
import { i18n } from '@core/config/i18n';
import { usePromptStudioDraftStore } from '@core/store/usePromptStudioDraftStore';
import { useProductionRunStore } from '@core/store/useProductionRunStore';
import { useProjectStore } from '@core/store/useProjectStore';
import { useSettingsStore } from '@core/store/useSettingsStore';
import { useAppStore } from '@core/store/useAppStore';
import { compileVideoPromptArtifact } from '@core/services/promptStudioService';
import type { PromptArtifactV1 } from '@core/types';
import { PromptStudioPage } from './PromptStudioPage';

const mocks = vi.hoisted(() => ({
  db: new Map<string, unknown>(),
  optimize: vi.fn(),
  key: vi.fn(),
}));
vi.mock('idb-keyval', () => ({
  createStore: (database: string, table: string) => `${database}:${table}`,
  get: async (key: string, store = 'default') => mocks.db.get(`${store}:${key}`),
  set: async (key: string, value: unknown, store = 'default') => {
    mocks.db.set(`${store}:${key}`, structuredClone(value));
  },
  del: async (key: string, store = 'default') => {
    mocks.db.delete(`${store}:${key}`);
  },
  keys: async () => [],
  clear: async () => mocks.db.clear(),
}));
vi.mock('@core/services/promptStudioService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@core/services/promptStudioService')>()),
  optimizeVideoPromptArtifact: mocks.optimize,
}));
vi.mock('@core/services/apiKeyService', () => ({ hasApiKeyAsync: mocks.key }));
vi.mock('@core/services/templateManager', () => ({ getUserTemplates: async () => [] }));

async function openStudio() {
  const result = render(<PromptStudioPage />);
  await screen.findByRole('textbox', { name: 'Core idea' });
  return result;
}
async function buildPack(
  user: ReturnType<typeof render>['user'],
  idea = 'A courier crosses a rainy street',
) {
  await user.type(screen.getByRole('textbox', { name: 'Core idea' }), idea);
  await user.click(screen.getByRole('button', { name: 'Build copy-ready pack' }));
  await screen.findByRole('textbox', { name: 'Primary prompt' });
  await waitFor(() => expect(usePromptStudioDraftStore.getState().status).toBe('saved'));
}

describe('PromptStudioPage durable copy desk', () => {
  let clipboard: ReturnType<typeof vi.fn>;
  beforeEach(async () => {
    await usePromptStudioDraftStore.getState().flush();
    mocks.db.clear();
    mocks.optimize.mockReset();
    mocks.key.mockReset().mockResolvedValue(true);
    localStorage.clear();
    await i18n.changeLanguage('en');
    usePromptStudioDraftStore.setState({ draft: null, status: 'loading', error: null });
    useProjectStore.setState({ currentProjectId: 'studio-test' });
    useAppStore.setState({ assets: [] });
    useSettingsStore.setState({
      enableExperimentalFeatures: false,
      promptGenerationProvider: 'gemini',
    });
    clipboard = vi.fn().mockResolvedValue(undefined);
  });
  afterEach(async () => {
    await usePromptStudioDraftStore.getState().flush();
    vi.restoreAllMocks();
  });
  const installClipboard = () =>
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: clipboard },
    });

  it('focuses the idea and displays one selected editable variant with synchronized copy fields', async () => {
    const { user } = await openStudio();
    installClipboard();
    expect(screen.getByRole('textbox', { name: 'Core idea' })).toHaveFocus();
    await buildPack(user);
    expect(screen.getByRole('heading', { name: 'Prompt Studio' })).toBeInTheDocument();
    expect(
      within(screen.getByRole('group', { name: 'Choose a variant' })).getAllByRole('button'),
    ).toHaveLength(3);
    expect(screen.getAllByRole('button', { name: 'Copy prompt' })).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Cinematic' }));
    const selected = screen.getByRole('textbox', { name: 'Cinematic prompt' });
    fireEvent.change(selected, { target: { value: 'My exact edited cinematic prompt' } });
    await user.click(screen.getByRole('button', { name: 'Copy prompt' }));
    expect(clipboard).toHaveBeenLastCalledWith('My exact edited cinematic prompt');
    expect(screen.queryByRole('textbox', { name: 'Primary prompt' })).not.toBeInTheDocument();
    expect(usePromptStudioDraftStore.getState().draft?.selectedVariant).toBe(1);
  });

  it('preserves inputs and edited variant after leaving and reopening Studio', async () => {
    const { user, unmount } = await openStudio();
    await buildPack(user, 'My persistent project idea');
    fireEvent.change(screen.getByRole('textbox', { name: 'Primary prompt' }), {
      target: { value: 'Edited output' },
    });
    unmount();
    await act(async () => {
      await usePromptStudioDraftStore.getState().flush();
    });
    usePromptStudioDraftStore.setState({ draft: null, status: 'loading', error: null });
    await openStudio();
    expect(screen.getByRole('textbox', { name: 'Core idea' })).toHaveValue(
      'My persistent project idea',
    );
    expect(screen.getByRole('textbox', { name: 'Primary prompt' })).toHaveValue('Edited output');
  });

  it.each(['flow-veo', 'kling', 'runway-gen3', 'sora', 'luma-ray'])(
    'keeps %s a manual copy handoff',
    async (target) => {
      const open = vi.spyOn(window, 'open').mockImplementation(() => null);
      open.mockClear();
      const { user } = await openStudio();
      installClipboard();
      await user.selectOptions(screen.getByRole('combobox', { name: 'Target' }), target);
      await buildPack(user);
      expect(usePromptStudioDraftStore.getState().draft?.artifact?.target).toBe(target);
      expect(screen.queryByRole('button', { name: 'Generate in app' })).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Copy prompt' }));
      expect(clipboard).toHaveBeenCalled();
      expect(open).not.toHaveBeenCalled();
    },
  );

  it('requires real image references and a supported duration before enabling API handoff', async () => {
    const { user } = await openStudio();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Target' }), 'veo-api');
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Prompt recipe' }),
      'image-to-video',
    );
    await buildPack(user);
    expect(screen.queryByRole('button', { name: 'Generate in app' })).not.toBeInTheDocument();
    expect(screen.getByText('Image-to-video requires a first frame.')).toBeInTheDocument();
    await act(async () => {
      useAppStore.setState({
        assets: [
          {
            id: 'img-1',
            name: 'Local first frame',
            type: 'image',
            data: '',
            mimeType: 'image/png',
            url: 'blob:local-frame',
          },
        ],
      });
    });
    await user.selectOptions(screen.getByRole('combobox', { name: 'Start frame' }), 'img-1');
    await user.click(screen.getByRole('button', { name: 'Build copy-ready pack' }));
    expect(await screen.findByRole('button', { name: 'Generate in app' })).toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Length' }), '10');
    await user.click(screen.getByRole('button', { name: 'Build copy-ready pack' }));
    await screen.findByRole('textbox', { name: 'Primary prompt' });
    expect(screen.queryByRole('button', { name: 'Generate in app' })).not.toBeInTheDocument();
    expect(screen.getByText('Veo API supports 4, 6 or 8 seconds.')).toBeInTheDocument();
  });

  it('ignores a completed AI request after the user changes input', async () => {
    let finish!: (value: PromptArtifactV1) => void;
    mocks.optimize.mockImplementation(
      () =>
        new Promise<PromptArtifactV1>((resolve) => {
          finish = resolve;
        }),
    );
    const { user } = await openStudio();
    await user.type(screen.getByRole('textbox', { name: 'Core idea' }), 'Original idea');
    await user.click(screen.getByRole('button', { name: 'Enhance with AI' }));
    await waitFor(() => expect(mocks.optimize).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByRole('textbox', { name: 'Core idea' }), {
      target: { value: 'New user idea' },
    });
    await act(async () =>
      finish(
        compileVideoPromptArtifact({
          idea: 'Stale AI idea',
          target: 'flow-veo',
          mode: 'text-to-video',
          durationSeconds: 8,
          aspectRatio: '16:9',
        }),
      ),
    );
    expect(screen.getByRole('textbox', { name: 'Core idea' })).toHaveValue('New user idea');
    expect(screen.queryByRole('textbox', { name: 'Primary prompt' })).not.toBeInTheDocument();
    expect(usePromptStudioDraftStore.getState().draft?.artifact).toBeNull();
  });

  it('does not send stale input after an asynchronous provider readiness check', async () => {
    let ready!: (value: boolean) => void;
    mocks.key.mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          ready = resolve;
        }),
    );
    const { user } = await openStudio();
    await user.type(screen.getByRole('textbox', { name: 'Core idea' }), 'Before readiness');
    await user.click(screen.getByRole('button', { name: 'Enhance with AI' }));
    await waitFor(() => expect(mocks.key).toHaveBeenCalled());
    fireEvent.change(screen.getByRole('textbox', { name: 'Core idea' }), {
      target: { value: 'Changed while checking' },
    });
    await act(async () => ready(true));
    expect(mocks.optimize).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox', { name: 'Core idea' })).toHaveValue(
      'Changed while checking',
    );
  });

  it('hands off the selected edited positive and negative prompt with source references', async () => {
    const createPlan = vi
      .spyOn(useProductionRunStore.getState(), 'createLocalPlan')
      .mockRejectedValue(new Error('Intercepted local plan'));
    const { user } = await openStudio();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Target' }), 'veo-api');
    await buildPack(user);
    await user.click(screen.getByRole('button', { name: 'Cinematic' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Cinematic prompt' }), {
      target: { value: 'My chosen camera move' },
    });
    await user.click(
      screen
        .getAllByText('Negative prompt', { exact: true })
        .find((element) => element.tagName === 'SUMMARY')!,
    );
    fireEvent.change(
      within(screen.getByRole('article')).getByRole('textbox', { name: 'Negative prompt' }),
      {
        target: { value: 'No signage or captions' },
      },
    );
    await user.click(screen.getByRole('button', { name: 'Generate in app' }));
    await waitFor(() =>
      expect(createPlan).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'studio-test',
          sourceVariantIndex: 1,
          sourceArtifactId: expect.any(String),
          sourceHandoffId: expect.any(String),
          studioInput: expect.objectContaining({
            idea: 'My chosen camera move',
            negativePrompt: 'No signage or captions',
            target: 'veo-api',
            durationSeconds: 8,
          }),
        }),
      ),
    );
  });

  it('opens Suno only after explicitly copying the selected music variant', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    open.mockClear();
    const { user } = await openStudio();
    installClipboard();
    await user.click(screen.getByRole('button', { name: 'Music & Lyrics' }));
    await user.type(
      await screen.findByRole('textbox', { name: 'Song idea / story' }),
      'Returning home',
    );
    await user.click(screen.getByRole('button', { name: 'Build copy-ready pack' }));
    await screen.findByRole('textbox', { name: 'Primary lyrics' });
    await user.click(screen.getByRole('button', { name: 'Hook-forward' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Hook-forward lyrics' }), {
      target: { value: '[Chorus]\nMy edited hook' },
    });
    await user.click(screen.getByRole('button', { name: 'Copy & Open Suno' }));
    expect(clipboard.mock.lastCall?.[0]).toContain('My edited hook');
    expect(open).toHaveBeenCalledWith('https://suno.com/create', '_blank', 'noopener,noreferrer');
  });

  it('surfaces clipboard failure and does not open Suno', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    open.mockClear();
    const { user } = await openStudio();
    clipboard.mockRejectedValue(new Error('Clipboard blocked'));
    installClipboard();
    await user.click(screen.getByRole('button', { name: 'Music & Lyrics' }));
    await user.type(
      await screen.findByRole('textbox', { name: 'Song idea / story' }),
      'Returning home',
    );
    await user.click(screen.getByRole('button', { name: 'Build copy-ready pack' }));
    await screen.findByRole('textbox', { name: 'Primary lyrics' });
    await user.click(screen.getByRole('button', { name: 'Copy & Open Suno' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Clipboard blocked');
    expect(open).not.toHaveBeenCalled();
  });
});
