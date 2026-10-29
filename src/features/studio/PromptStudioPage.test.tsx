import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render as renderDirect } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, useNavigate } from 'react-router';
import { act, fireEvent, render, screen, waitFor, within } from '@/test-utils';
import { i18n } from '@core/config/i18n';
import { usePromptStudioDraftStore } from '@core/store/usePromptStudioDraftStore';
import { useProductionRunStore } from '@core/store/useProductionRunStore';
import { useProjectStore } from '@core/store/useProjectStore';
import { useSettingsStore } from '@core/store/useSettingsStore';
import { useAppStore } from '@core/store/useAppStore';
import { studioRevisionService } from '@core/services/studioRevisionService';
import { promptStudioHandoffService } from '@core/services/promptStudioHandoffService';
import { editStudioVariant } from '@core/services/promptStudioEditingService';
import {
  compileMusicPromptArtifact,
  compileVideoPromptArtifact,
} from '@core/services/promptStudioService';
import type {
  MusicPromptArtifactInput,
  MusicPromptVariant,
  PromptArtifactV1,
  StudioFeedbackNavigationState,
  VideoPromptArtifactInput,
  VideoPromptVariant,
} from '@core/types';
import type {
  MusicVariantEditResult,
  VideoVariantEditResult,
} from '@core/services/videoVariantEditService';
import { PromptStudioPage } from './PromptStudioPage';

// Zustand updates replace state objects; restoring a spy on an older object
// does not restore the action copied into newer snapshots.
const originalDraftActions = usePromptStudioDraftStore.getState();

const mocks = vi.hoisted(() => ({
  db: new Map<string, unknown>(),
  optimize: vi.fn(),
  optimizeMusic: vi.fn(),
  variantEdit: vi.fn(),
  musicVariantEdit: vi.fn(),
  key: vi.fn(),
  expandScene: vi.fn(),
  expandMusic: vi.fn(),
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
  update: async (key: string, updater: (value: unknown) => unknown, store = 'default') => {
    mocks.db.set(`${store}:${key}`, structuredClone(updater(mocks.db.get(`${store}:${key}`))));
  },
  keys: async () => [],
  clear: async () => mocks.db.clear(),
}));
vi.mock('@core/services/promptStudioService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@core/services/promptStudioService')>()),
  optimizeVideoPromptArtifact: mocks.optimize,
  optimizeMusicPromptArtifact: mocks.optimizeMusic,
  expandVideoSceneDetails: mocks.expandScene,
  expandMusicDetails: mocks.expandMusic,
}));
vi.mock('@core/services/apiKeyService', () => ({ hasApiKeyAsync: mocks.key }));
vi.mock('@core/services/videoVariantEditService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@core/services/videoVariantEditService')>()),
  proposeVideoVariantEdit: mocks.variantEdit,
  proposeMusicVariantEdit: mocks.musicVariantEdit,
}));
vi.mock('@core/services/templateManager', () => ({
  getUserTemplates: async () => [],
  getUserTemplatesStrict: async () => [],
}));

async function openStudio() {
  const result = render(<PromptStudioPage />);
  await screen.findByRole('textbox', { name: 'Core idea' });
  return result;
}
async function openStudioWithNavigationState(
  state: StudioFeedbackNavigationState,
  nextState?: StudioFeedbackNavigationState,
) {
  const result = renderDirect(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={[{ pathname: '/studio', state }]}>
        {nextState ? <FeedbackStateNavigator state={nextState} /> : null}
        <PromptStudioPage />
      </MemoryRouter>
    </I18nextProvider>,
  );
  await screen.findByRole('textbox', { name: 'Core idea' });
  return { ...result, user: userEvent.setup() };
}
function FeedbackStateNavigator({ state }: { state: StudioFeedbackNavigationState }) {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate('/studio?mode=video', { state })}>
      Open next reviewed result
    </button>
  );
}
async function buildPack(
  user: ReturnType<typeof render>['user'],
  idea = 'A courier crosses a rainy street',
) {
  // Seed the fixture atomically; browser scenarios cover the actual editing interaction.
  const field = screen.getByRole('textbox', {
    name: /^(Core idea|Describe the motion)$/,
  }) as HTMLTextAreaElement;
  fireEvent.change(field, { target: { value: field.value + idea } });
  await user.click(screen.getByRole('button', { name: 'Build copy-ready pack' }));
  await screen.findByRole('textbox', { name: 'Primary prompt' });
  await waitFor(() => expect(usePromptStudioDraftStore.getState().status).toBe('saved'));
}
async function buildMusicPack(user: ReturnType<typeof render>['user'], topic = 'A midnight train') {
  await user.click(screen.getByRole('button', { name: 'Music & Lyrics' }));
  await user.type(await screen.findByRole('textbox', { name: 'Song idea / story' }), topic);
  await user.click(screen.getByRole('button', { name: 'Build copy-ready pack' }));
  await screen.findByRole('textbox', { name: 'Primary lyrics' });
  await waitFor(() => expect(usePromptStudioDraftStore.getState().status).toBe('saved'));
}

function variantProposalFor(
  source: PromptArtifactV1,
  index: 0 | 1 | 2 = 0,
): VideoVariantEditResult {
  const variant = [source.primary, ...source.alternatives][index] as VideoPromptVariant;
  return {
    before: { prompt: variant.prompt, negativePrompt: variant.negativePrompt },
    patch: { prompt: 'Targeted reviewed edit', negativePrompt: 'proposed exclusions' },
    provenance: { ...source.provenance, provider: 'gemini', source: 'optimizer' },
  };
}

function musicVariantProposalFor(
  source: PromptArtifactV1,
  index: 0 | 1 | 2 = 0,
): MusicVariantEditResult {
  const variant = [source.primary, ...source.alternatives][index] as MusicPromptVariant;
  return {
    before: { styleOfMusic: variant.styleOfMusic, lyrics: variant.lyrics },
    patch: { styleOfMusic: 'Nordic strings, brushed drums', lyrics: '[Chorus]\nA brighter hook' },
    provenance: { ...source.provenance, provider: 'gemini', source: 'optimizer' },
  };
}

async function requestVariantProposal(user: ReturnType<typeof render>['user']) {
  await user.click(screen.getByText('Improve selected variant', { exact: true }));
  await user.selectOptions(screen.getByRole('combobox', { name: 'Fields to improve' }), 'both');
  await user.click(screen.getByRole('button', { name: 'Propose selected variant changes' }));
}

describe('PromptStudioPage durable copy desk', () => {
  let clipboard: ReturnType<typeof vi.fn>;
  beforeEach(async () => {
    await usePromptStudioDraftStore.getState().flush();
    mocks.db.clear();
    mocks.optimize.mockReset();
    mocks.optimizeMusic.mockReset();
    mocks.variantEdit.mockReset();
    mocks.musicVariantEdit.mockReset();
    mocks.key.mockReset().mockResolvedValue(true);
    mocks.expandScene.mockReset().mockImplementation(async (video: VideoPromptArtifactInput) => ({
      ...video,
      subject: 'AI-generated subject',
      action: 'AI-generated action',
      environment: 'AI-generated environment',
      camera: 'AI-generated camera',
    }));
    mocks.expandMusic.mockReset().mockImplementation(async (music: MusicPromptArtifactInput) => ({
      ...music,
      genre: 'AI-generated genre',
      mood: 'AI-generated mood',
      lyrics: '[Chorus]\nAI lyrics',
    }));
    localStorage.clear();
    await i18n.changeLanguage('en');
    usePromptStudioDraftStore.setState({
      ...originalDraftActions,
      draft: null,
      status: 'loading',
      error: null,
    });
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
    vi.unstubAllGlobals();
  });
  const installClipboard = () =>
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: clipboard },
    });

  it('preserves keyboard focus when an earlier hydration finishes late', async () => {
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const hydrate = usePromptStudioDraftStore.getState().hydrate;
    vi.spyOn(usePromptStudioDraftStore.getState(), 'hydrate').mockImplementation(async (id) => {
      const ok = await hydrate(id);
      await pending;
      return ok;
    });
    const { user } = await openStudio();
    fireEvent.change(screen.getByRole('textbox', { name: 'Core idea' }), {
      target: { value: 'A bicycle crosses a bridge' },
    });
    const build = screen.getByRole('button', { name: 'Build copy-ready pack' });
    build.focus();
    await act(async () => finish());
    expect(build).toHaveFocus();
    await user.keyboard('{Enter}');
    const prompt = (await screen.findByRole('textbox', {
      name: 'Primary prompt',
    })) as HTMLTextAreaElement;
    expect(prompt.value).toContain('bicycle');
  });

  it('uses available workspace width and preserves content across editor/result navigation', async () => {
    let resize!: ResizeObserverCallback;
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: ResizeObserverCallback) {
          resize = callback;
        }
        observe() {}
        disconnect() {}
      },
    );
    const { user, container } = await openStudio();
    const measure = (width: number) =>
      act(() => resize([{ contentRect: { width } } as ResizeObserverEntry], {} as ResizeObserver));
    measure(959);
    expect(container.querySelector('.studio-workspace')).toHaveAttribute('data-layout', 'tabs');
    expect(screen.getByRole('button', { name: 'Editor' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('textbox', { name: 'Primary prompt' })).toBeNull();
    // This scenario checks layout and retained content; character-by-character typing
    // is covered by the keyboard flow and adds avoidable coverage instrumentation work.
    fireEvent.change(screen.getByRole('textbox', { name: 'Core idea' }), {
      target: { value: 'Retained narrow workspace idea' },
    });
    await user.click(screen.getByRole('button', { name: 'Build copy-ready pack' }));
    await screen.findByRole('textbox', { name: 'Primary prompt' });
    expect(screen.getByRole('button', { name: 'Result' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('textbox', { name: 'Core idea' })).toBeNull();
    await waitFor(() => expect(container.querySelector('.studio-output')).toHaveFocus());
    await user.click(screen.getByRole('button', { name: 'Cinematic' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Cinematic prompt' }), {
      target: { value: 'Retained edited variant' },
    });
    await user.click(screen.getByRole('button', { name: 'Editor' }));
    expect(screen.getByRole('textbox', { name: 'Core idea' })).toHaveValue(
      'Retained narrow workspace idea',
    );
    await user.click(screen.getByRole('button', { name: 'Result' }));
    expect(screen.getByRole('textbox', { name: 'Cinematic prompt' })).toHaveValue(
      'Retained edited variant',
    );
    const source = usePromptStudioDraftStore.getState().draft!.artifact!;
    mocks.optimize.mockResolvedValue(editStudioVariant(source, 1, { prompt: 'Reviewed proposal' }));
    await user.click(screen.getByRole('button', { name: 'Editor' }));
    await user.click(screen.getByRole('button', { name: 'Improve full package' }));
    await screen.findByRole('button', { name: 'Accept changes' });
    expect(screen.getByRole('button', { name: 'Result' })).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => expect(container.querySelector('.studio-output')).toHaveFocus());
    await user.click(screen.getByRole('button', { name: 'Reject changes' }));
    act(() => usePromptStudioDraftStore.setState({ status: 'loading' }));
    expect(container.querySelector('.studio-workspace')).toHaveAttribute('aria-busy', 'true');
    act(() => usePromptStudioDraftStore.setState({ status: 'saved' }));
    measure(960);
    expect(container.querySelector('.studio-workspace')).toHaveAttribute('data-layout', 'split');
    expect(screen.getByRole('textbox', { name: 'Core idea' })).toHaveValue(
      'Retained narrow workspace idea',
    );
    expect(screen.queryByRole('button', { name: 'Editor' })).toBeNull();
  });

  it('keeps the focused editor or result visible when a split workspace becomes tabbed', async () => {
    let resize!: ResizeObserverCallback;
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: ResizeObserverCallback) {
          resize = callback;
        }
        observe() {}
        disconnect() {}
      },
    );
    const { user, container } = await openStudio();
    const measure = (width: number) =>
      act(() => resize([{ contentRect: { width } } as ResizeObserverEntry], {} as ResizeObserver));
    measure(1536);
    fireEvent.change(screen.getByRole('textbox', { name: 'Core idea' }), {
      target: { value: 'Preserved idea on resize' },
    });
    await user.click(screen.getByRole('button', { name: 'Build copy-ready pack' }));
    const prompt = await screen.findByRole('textbox', { name: 'Primary prompt' });
    await waitFor(() => expect(usePromptStudioDraftStore.getState().status).toBe('saved'));
    const artifact = usePromptStudioDraftStore.getState().draft!.artifact;
    const idea = screen.getByRole('textbox', { name: 'Core idea' });
    idea.focus();
    measure(865);
    expect(screen.getByRole('button', { name: 'Editor' })).toHaveAttribute('aria-pressed', 'true');
    expect(idea).toHaveFocus();
    expect(idea).toBeVisible();
    expect(idea).toHaveValue('Preserved idea on resize');
    expect(container.querySelector('.studio-output')).toHaveAttribute('hidden');
    expect(usePromptStudioDraftStore.getState().draft!.artifact).toEqual(artifact);
    measure(1536);
    prompt.focus();
    measure(865);
    expect(screen.getByRole('button', { name: 'Result' })).toHaveAttribute('aria-pressed', 'true');
    expect(prompt).toHaveFocus();
    expect(prompt).toBeVisible();
    expect(container.querySelector('.studio-columns > .studio-brief')).toHaveAttribute('hidden');
  });

  it('keeps primary build before advanced details and groups library controls into three views', async () => {
    const { user, container } = await openStudio();
    const build = screen.getByRole('button', { name: 'Build copy-ready pack' });
    const advanced = screen.getByText('Scene details', { exact: true });
    expect(build.compareDocumentPosition(advanced) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await user.click(screen.getByText('Templates and history', { exact: true }));
    expect(screen.getByRole('button', { name: 'Templates' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await user.click(screen.getByRole('button', { name: 'Previous packs' }));
    expect(container.querySelector('.studio-library-panel:not([hidden]) select')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Revisions' }));
    expect(container.querySelectorAll('.studio-library-panel:not([hidden])')).toHaveLength(1);
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

  it.each(['flow-veo', 'kling', 'runway-gen3', 'sora', 'luma-ray', 'wan-video', 'minimax-hailuo'])(
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
    expect(screen.getAllByText('Image-to-video requires a first frame.').length).toBeGreaterThan(0);
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
    expect(screen.getAllByText('Veo API supports 4, 6 or 8 seconds.').length).toBeGreaterThan(0);
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
    await user.click(screen.getByRole('button', { name: 'Improve full package' }));
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
    await user.click(screen.getByRole('button', { name: 'Improve full package' }));
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
  it('previews AI changes and preserves the current edit until explicit acceptance', async () => {
    const { user } = await openStudio();
    await buildPack(user);
    fireEvent.change(screen.getByRole('textbox', { name: 'Primary prompt' }), {
      target: { value: 'My own exact edit' },
    });
    const source = usePromptStudioDraftStore.getState().draft!.artifact!;
    mocks.optimize.mockResolvedValue(editStudioVariant(source, 0, { prompt: 'Proposed AI edit' }));
    await user.click(screen.getByRole('button', { name: 'Improve full package' }));
    await screen.findByRole('region', { name: 'Review AI changes' });
    expect(screen.getByRole('textbox', { name: 'Primary prompt' })).toHaveValue(
      'My own exact edit',
    );
    await user.click(screen.getByRole('button', { name: 'Accept changes' }));
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: 'Primary prompt' })).toHaveValue(
        'Proposed AI edit',
      ),
    );
    const versions = await studioRevisionService.list('studio-test');
    expect(
      versions.some(
        (item) =>
          (item.snapshot.artifact?.primary as { prompt?: string })?.prompt === 'My own exact edit',
      ),
    ).toBe(true);
  });

  it('rejects full-package changes that omit quoted dialogue in the current primary variant', async () => {
    const { user } = await openStudio();
    await buildPack(user);
    const manual = 'A runner says "Stay here" and crosses the park.';
    fireEvent.change(screen.getByRole('textbox', { name: 'Primary prompt' }), {
      target: { value: manual },
    });
    await waitFor(() => expect(usePromptStudioDraftStore.getState().status).toBe('saved'));
    const source = usePromptStudioDraftStore.getState().draft!.artifact!;
    mocks.optimize.mockResolvedValue(
      editStudioVariant(source, 0, { prompt: 'A silent runner crosses the park.' }),
    );

    await user.click(screen.getByRole('button', { name: 'Improve full package' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The AI response changed or omitted protected dialogue.',
    );
    expect(usePromptStudioDraftStore.getState().draft!.artifact).toEqual(source);
    expect(screen.queryByRole('region', { name: 'Review AI changes' })).toBeNull();
  });

  it('opens the rights declarations without changing settings automatically', async () => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(private callback: ResizeObserverCallback) {}
        observe() {
          this.callback(
            [{ contentRect: { width: 600 } } as ResizeObserverEntry],
            {} as ResizeObserver,
          );
        }
        disconnect() {}
      },
    );
    const { user } = await openStudio();
    await user.click(screen.getByRole('button', { name: 'Music & Lyrics' }));
    await user.type(await screen.findByRole('textbox', { name: 'Song idea / story' }), 'Home');
    await user.click(screen.getByRole('button', { name: 'Build copy-ready pack' }));
    await screen.findByRole('textbox', { name: 'Primary lyrics' });
    const original = usePromptStudioDraftStore.getState().draft!.music.rightsChecklist;
    await user.click(screen.getByText('Readiness checks', { exact: true }));
    const issue = screen.getByText('Rights-safe handoff').closest('div')!.parentElement!;
    await user.click(within(issue).getByRole('button', { name: 'Open control' }));
    await waitFor(() =>
      expect(screen.getByRole('checkbox', { name: 'Original or licensed lyrics' })).toHaveFocus(),
    );
    expect(screen.getByRole('button', { name: 'Editor' })).toHaveAttribute('aria-pressed', 'true');
    expect(usePromptStudioDraftStore.getState().draft!.music.rightsChecklist).toEqual(original);
  });

  it('discards a previous project history response after switching projects', async () => {
    let resolve!: (artifacts: PromptArtifactV1[]) => void;
    const pending = new Promise<PromptArtifactV1[]>((done) => {
      resolve = done;
    });
    const old = {
      ...compileVideoPromptArtifact({
        idea: 'Private previous project',
        target: 'flow-veo',
        mode: 'text-to-video',
        durationSeconds: 8,
        aspectRatio: '16:9',
      }),
      id: 'old-artifact',
      projectId: 'studio-test',
    };
    vi.spyOn(promptStudioHandoffService, 'listArtifacts').mockImplementation(async (id) =>
      id === 'studio-test' ? pending : [],
    );
    const { user } = await openStudio();
    await act(async () => {
      useProjectStore.setState({ currentProjectId: 'new-project' });
    });
    await waitFor(() =>
      expect(usePromptStudioDraftStore.getState().draft?.projectId).toBe('new-project'),
    );
    await act(async () => {
      resolve([old]);
    });
    await user.click(screen.getByText('Templates and history', { exact: true }));
    expect(screen.queryByRole('option', { name: old.primary.label })).toBeNull();
    expect(usePromptStudioDraftStore.getState().draft?.artifact).toBeNull();
  });

  it('rejects an AI proposal without changing the draft or adding an AI revision', async () => {
    const { user } = await openStudio();
    await buildPack(user);
    const source = usePromptStudioDraftStore.getState().draft!.artifact!;
    mocks.optimize.mockResolvedValue(editStudioVariant(source, 0, { prompt: 'Rejected edit' }));
    await user.click(screen.getByRole('button', { name: 'Improve full package' }));
    await screen.findByRole('button', { name: 'Reject changes' });
    await user.click(screen.getByRole('button', { name: 'Reject changes' }));
    expect(usePromptStudioDraftStore.getState().draft!.artifact).toEqual(source);
    expect(
      (await studioRevisionService.list('studio-test')).some((item) => item.reason === 'ai'),
    ).toBe(false);
  });

  it('invalidates an already displayed proposal after an edit', async () => {
    const { user } = await openStudio();
    await buildPack(user);
    const source = usePromptStudioDraftStore.getState().draft!.artifact!;
    mocks.optimize.mockResolvedValue(editStudioVariant(source, 0, { prompt: 'Stale proposal' }));
    await user.click(screen.getByRole('button', { name: 'Improve full package' }));
    await screen.findByRole('button', { name: 'Accept changes' });
    fireEvent.change(screen.getByRole('textbox', { name: 'Primary prompt' }), {
      target: { value: 'Newer user edit' },
    });
    expect(screen.queryByRole('button', { name: 'Accept changes' })).toBeNull();
    expect(screen.getByRole('textbox', { name: 'Primary prompt' })).toHaveValue('Newer user edit');
  });

  it.each(['edit', 'project'])('discards a late AI response after a %s change', async (change) => {
    const { user } = await openStudio();
    await buildPack(user);
    const source = usePromptStudioDraftStore.getState().draft!.artifact!;
    let resolve!: (artifact: PromptArtifactV1) => void;
    mocks.optimize.mockReturnValue(
      new Promise<PromptArtifactV1>((done) => {
        resolve = done;
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Improve full package' }));
    await waitFor(() => expect(mocks.optimize).toHaveBeenCalled());
    if (change === 'edit') {
      fireEvent.change(screen.getByRole('textbox', { name: 'Primary prompt' }), {
        target: { value: 'Newer manual edit' },
      });
    } else {
      await act(async () => {
        useProjectStore.setState({ currentProjectId: 'other-project' });
      });
      await waitFor(() =>
        expect(usePromptStudioDraftStore.getState().draft?.projectId).toBe('other-project'),
      );
    }
    await act(async () => {
      resolve(editStudioVariant(source, 0, { prompt: 'Late response' }));
    });
    expect(screen.queryByRole('button', { name: 'Accept changes' })).toBeNull();
    if (change === 'edit')
      expect(screen.getByRole('textbox', { name: 'Primary prompt' })).toHaveValue(
        'Newer manual edit',
      );
    else expect(usePromptStudioDraftStore.getState().draft?.artifact).toBeNull();
  });

  it('reviews a section rewrite before changing lyrics', async () => {
    const { user } = await openStudio();
    await user.click(screen.getByRole('button', { name: 'Music & Lyrics' }));
    await user.type(await screen.findByRole('textbox', { name: 'Song idea / story' }), 'Home');
    await user.click(screen.getByText('Music details and original lyrics', { exact: true }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Your lyrics (optional)' }), {
      target: { value: '[Verse]\nOriginal verse\n\n[Chorus]\nOriginal hook' },
    });
    await user.click(screen.getByRole('button', { name: 'Build copy-ready pack' }));
    await screen.findByRole('textbox', { name: 'Primary lyrics' });
    const original = usePromptStudioDraftStore.getState().draft!.artifact!;
    mocks.optimizeMusic.mockResolvedValue(
      compileMusicPromptArtifact({
        topic: 'Home',
        language: 'English',
        lyrics: '[Verse]\nIgnored verse\n\n[Chorus]\nRewritten hook',
      }),
    );
    await user.click(screen.getByText('Revise lyrics with AI', { exact: true }));
    await user.click(screen.getByRole('button', { name: 'Rewrite section' }));
    await screen.findByRole('button', { name: 'Accept changes' });
    expect(usePromptStudioDraftStore.getState().draft!.artifact).toEqual(original);
    await user.click(screen.getByRole('button', { name: 'Accept changes' }));
    await waitFor(() =>
      expect(
        (screen.getByRole('textbox', { name: 'Primary lyrics' }) as HTMLTextAreaElement).value,
      ).toContain('Rewritten hook'),
    );
    expect(
      (screen.getByRole('textbox', { name: 'Primary lyrics' }) as HTMLTextAreaElement).value,
    ).toContain('Original verse');
  });

  it('checkpoints edited alternatives before selecting a new target', async () => {
    const { user } = await openStudio();
    await buildPack(user);
    await user.click(screen.getByRole('button', { name: 'Cinematic' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Cinematic prompt' }), {
      target: { value: 'Keep my cinematic edit' },
    });
    await user.selectOptions(screen.getByRole('combobox', { name: 'Target' }), 'wan-video');
    await waitFor(() =>
      expect(usePromptStudioDraftStore.getState().draft!.video.target).toBe('wan-video'),
    );
    const versions = await studioRevisionService.list('studio-test');
    const previous = versions.find((item) => item.reason === 'target');
    expect(previous?.snapshot.selectedVariant).toBe(1);
    expect(previous?.snapshot.artifact?.alternatives[0]).toMatchObject({
      prompt: 'Keep my cinematic edit',
    });
    expect(usePromptStudioDraftStore.getState().draft!.artifact).toBeNull();
  });

  it('reviews and accepts selected AI fields for the manually edited alternative only', async () => {
    const { user } = await openStudio();
    await buildPack(user);
    await user.click(screen.getByRole('button', { name: 'Cinematic' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Cinematic prompt' }), {
      target: { value: 'My exact alternative edit' },
    });
    const source = usePromptStudioDraftStore.getState().draft!.artifact!;
    mocks.variantEdit.mockResolvedValue(variantProposalFor(source, 1));
    await requestVariantProposal(user);
    await screen.findByRole('region', { name: 'Review selected variant changes' });
    expect(mocks.variantEdit).toHaveBeenCalledWith(
      expect.objectContaining({
        artifact: source,
        variantIndex: 1,
        fields: ['prompt', 'negativePrompt'],
      }),
    );
    expect(screen.getByRole('textbox', { name: 'Cinematic prompt' })).toHaveValue(
      'My exact alternative edit',
    );
    await user.click(screen.getByRole('checkbox', { name: 'Accept Negative prompt' }));
    await user.click(screen.getByRole('button', { name: 'Accept selected fields' }));
    await waitFor(() => expect(usePromptStudioDraftStore.getState().status).toBe('saved'));
    const accepted = usePromptStudioDraftStore.getState().draft!.artifact!;
    expect(accepted.primary).toEqual(source.primary);
    expect(accepted.alternatives[1]).toEqual(source.alternatives[1]);
    expect(accepted.alternatives[0]).toMatchObject({
      prompt: 'Targeted reviewed edit',
      copyPrompt: 'Targeted reviewed edit',
      negativePrompt: (source.alternatives[0] as VideoPromptVariant).negativePrompt,
    });
    expect(
      (await studioRevisionService.list('studio-test')).some(
        (item) => item.reason === 'ai-variant',
      ),
    ).toBe(true);
  });

  it('improves the current selected music style by default without changing other variants', async () => {
    const { user } = await openStudio();
    await buildMusicPack(user);
    fireEvent.change(screen.getByRole('textbox', { name: 'Genre / blend' }), {
      target: { value: 'Latest dream-pop brief' },
    });
    await user.click(screen.getByRole('button', { name: 'Hook-forward' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Hook-forward style' }), {
      target: { value: 'My manually edited folk-pop style' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Hook-forward lyrics' }), {
      target: { value: '[Chorus]\nMy manually edited hook' },
    });
    const source = usePromptStudioDraftStore.getState().draft!.artifact!;
    const beforePrimary = structuredClone(source.primary);
    const beforeOtherAlternative = structuredClone(source.alternatives[1]);
    const currentVariant = source.alternatives[0] as MusicPromptVariant;
    mocks.musicVariantEdit.mockResolvedValue(musicVariantProposalFor(source, 1));

    await user.click(screen.getByText('Improve selected music variant', { exact: true }));
    await user.type(
      screen.getByRole('textbox', { name: 'Requested improvement' }),
      'Simpler drums',
    );
    await user.click(screen.getByRole('button', { name: 'Propose music changes' }));

    await screen.findByRole('region', { name: 'Review music changes' });
    expect(mocks.musicVariantEdit).toHaveBeenCalledWith(
      expect.objectContaining({
        artifact: expect.objectContaining({
          primary: source.primary,
          alternatives: source.alternatives,
          input: expect.objectContaining({ genre: 'Latest dream-pop brief' }),
        }),
        variantIndex: 1,
        fields: ['styleOfMusic'],
        direction: 'Simpler drums',
      }),
    );
    expect(mocks.musicVariantEdit.mock.calls[0][0].artifact.alternatives[0]).toMatchObject({
      styleOfMusic: 'My manually edited folk-pop style',
      lyrics: '[Chorus]\nMy manually edited hook',
    });
    expect(mocks.musicVariantEdit.mock.calls[0][0].artifact.input.genre).toBe(
      'Latest dream-pop brief',
    );
    await user.click(screen.getByRole('button', { name: 'Accept selected fields' }));
    await waitFor(() => expect(usePromptStudioDraftStore.getState().status).toBe('saved'));

    const accepted = usePromptStudioDraftStore.getState().draft!.artifact!;
    expect(accepted.primary).toEqual(beforePrimary);
    expect(accepted.alternatives[0]).toMatchObject({
      title: currentVariant.title,
      styleOfMusic: 'Nordic strings, brushed drums',
      lyrics: '[Chorus]\nMy manually edited hook',
      productionNotes: currentVariant.productionNotes,
    });
    expect(accepted.alternatives[1]).toEqual(beforeOtherAlternative);
  });

  it('accepts only the chosen field from a combined music proposal', async () => {
    const { user } = await openStudio();
    await buildMusicPack(user);
    await user.click(screen.getByRole('button', { name: 'Hook-forward' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Hook-forward style' }), {
      target: { value: 'Manual style to retain' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Hook-forward lyrics' }), {
      target: { value: '[Chorus]\nCurrent hook' },
    });
    const source = usePromptStudioDraftStore.getState().draft!.artifact!;
    const variant = source.alternatives[0] as MusicPromptVariant;
    const originalAlternative = source.alternatives[1];
    mocks.musicVariantEdit.mockResolvedValue(musicVariantProposalFor(source, 1));

    await user.click(screen.getByText('Improve selected music variant', { exact: true }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Fields to improve' }), 'both');
    await user.type(
      screen.getByRole('textbox', { name: 'Requested improvement' }),
      'Lift the chorus',
    );
    await user.click(screen.getByRole('button', { name: 'Propose music changes' }));
    await screen.findByRole('region', { name: 'Review music changes' });
    expect(mocks.musicVariantEdit).toHaveBeenCalledWith(
      expect.objectContaining({ fields: ['styleOfMusic', 'lyrics'] }),
    );

    await user.click(screen.getByRole('checkbox', { name: 'Accept Music style' }));
    await user.click(screen.getByRole('button', { name: 'Accept selected fields' }));
    await waitFor(() => expect(usePromptStudioDraftStore.getState().status).toBe('saved'));
    const accepted = usePromptStudioDraftStore.getState().draft!;
    expect(accepted.artifact!.alternatives[0] as MusicPromptVariant).toMatchObject({
      title: variant.title,
      styleOfMusic: 'Manual style to retain',
      lyrics: '[Chorus]\nA brighter hook',
      productionNotes: variant.productionNotes,
    });
    expect(accepted.artifact!.alternatives[1]).toEqual(originalAlternative);
    expect(accepted.music.lyrics).toBe('[Chorus]\nA brighter hook');
  });

  it('disables lyric edits for instrumental music', async () => {
    const { user } = await openStudio();
    await user.click(screen.getByRole('button', { name: 'Music & Lyrics' }));
    await user.type(
      await screen.findByRole('textbox', { name: 'Song idea / story' }),
      'Quiet night',
    );
    await user.click(screen.getByText('Music details and original lyrics', { exact: true }));
    await user.click(screen.getByRole('checkbox', { name: 'Instrumental mode' }));
    await user.click(screen.getByRole('button', { name: 'Build copy-ready pack' }));
    await screen.findByRole('textbox', { name: 'Primary lyrics' });
    await user.click(screen.getByText('Improve selected music variant', { exact: true }));
    const fields = screen.getByRole('combobox', { name: 'Fields to improve' });
    expect(within(fields).getByRole('option', { name: 'Your lyrics (optional)' })).toBeDisabled();
    expect(within(fields).getByRole('option', { name: 'Music style and lyrics' })).toBeDisabled();
  });

  it('rejects a selected-variant proposal without replacing manual edits', async () => {
    const { user } = await openStudio();
    await buildPack(user);
    const source = usePromptStudioDraftStore.getState().draft!.artifact!;
    mocks.variantEdit.mockResolvedValue(variantProposalFor(source));
    await requestVariantProposal(user);
    await screen.findByRole('button', { name: 'Accept selected fields' });
    await user.click(screen.getByRole('button', { name: 'Reject changes' }));
    expect(usePromptStudioDraftStore.getState().draft!.artifact).toEqual(source);
    expect(screen.queryByRole('button', { name: 'Accept selected fields' })).toBeNull();
  });

  it.each(['edit', 'variant', 'project'])(
    'discards a late selected-variant proposal after a %s change',
    async (change) => {
      const { user } = await openStudio();
      await buildPack(user);
      const source = usePromptStudioDraftStore.getState().draft!.artifact!;
      let finish!: (result: VideoVariantEditResult) => void;
      mocks.variantEdit.mockReturnValue(
        new Promise<VideoVariantEditResult>((resolve) => {
          finish = resolve;
        }),
      );
      await requestVariantProposal(user);
      await waitFor(() => expect(mocks.variantEdit).toHaveBeenCalled());
      if (change === 'edit') {
        fireEvent.change(screen.getByRole('textbox', { name: 'Primary prompt' }), {
          target: { value: 'A newer manual edit' },
        });
      } else if (change === 'variant') {
        await user.click(screen.getByRole('button', { name: 'Cinematic' }));
      } else {
        await act(async () => {
          useProjectStore.setState({ currentProjectId: 'new-video-project' });
        });
        await waitFor(() =>
          expect(usePromptStudioDraftStore.getState().draft?.projectId).toBe('new-video-project'),
        );
      }
      await act(async () => finish(variantProposalFor(source)));
      expect(screen.queryByRole('button', { name: 'Accept selected fields' })).toBeNull();
      if (change === 'edit')
        expect(screen.getByRole('textbox', { name: 'Primary prompt' })).toHaveValue(
          'A newer manual edit',
        );
    },
  );

  it('cancels a selected-variant request immediately and ignores its late response after restart', async () => {
    const { user } = await openStudio();
    await buildPack(user);
    const source = usePromptStudioDraftStore.getState().draft!.artifact!;
    let finishFirst!: (result: VideoVariantEditResult) => void;
    mocks.variantEdit
      .mockReturnValueOnce(
        new Promise<VideoVariantEditResult>((resolve) => {
          finishFirst = resolve;
        }),
      )
      .mockResolvedValueOnce({
        ...variantProposalFor(source),
        patch: { prompt: 'Current restarted proposal' },
      });

    await user.click(screen.getByText('Improve selected variant', { exact: true }));
    await user.click(screen.getByRole('button', { name: 'Propose selected variant changes' }));
    await waitFor(() => expect(mocks.variantEdit).toHaveBeenCalledTimes(1));
    const firstSignal = mocks.variantEdit.mock.calls[0][0].signal as AbortSignal;
    await user.click(screen.getAllByRole('button', { name: 'Cancel' })[0]);
    expect(firstSignal.aborted).toBe(true);
    expect(screen.queryByText('Preparing a proposal…')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Propose selected variant changes' }));
    await screen.findByRole('region', { name: 'Review selected variant changes' });
    await act(async () =>
      finishFirst({
        ...variantProposalFor(source),
        patch: { prompt: 'Late obsolete proposal' },
      }),
    );
    expect(
      screen.getByRole('region', { name: 'Review selected variant changes' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('+ Late obsolete proposal')).toBeNull();
    expect(screen.getByRole('textbox', { name: 'Primary prompt' })).toHaveValue(
      (source.primary as VideoPromptVariant).prompt,
    );
  });

  it('preserves the selected variant if its acceptance checkpoint fails', async () => {
    const { user } = await openStudio();
    await buildPack(user);
    const source = usePromptStudioDraftStore.getState().draft!.artifact!;
    mocks.variantEdit.mockResolvedValue(variantProposalFor(source));
    await requestVariantProposal(user);
    await screen.findByRole('button', { name: 'Accept selected fields' });
    vi.spyOn(usePromptStudioDraftStore.getState(), 'checkpoint').mockResolvedValueOnce(false);
    await user.click(screen.getByRole('button', { name: 'Accept selected fields' }));
    await screen.findByRole('alert');
    expect(usePromptStudioDraftStore.getState().draft!.artifact).toEqual(source);
  });

  it('preserves a newer edit made while a selected-variant checkpoint is pending', async () => {
    const { user } = await openStudio();
    await buildPack(user);
    const source = usePromptStudioDraftStore.getState().draft!.artifact!;
    mocks.variantEdit.mockResolvedValue(variantProposalFor(source));
    await requestVariantProposal(user);
    await screen.findByRole('button', { name: 'Accept selected fields' });
    let finish!: (result: boolean) => void;
    const checkpoint = vi
      .spyOn(usePromptStudioDraftStore.getState(), 'checkpoint')
      .mockReturnValueOnce(
        new Promise<boolean>((resolve) => {
          finish = resolve;
        }),
      );
    await user.click(screen.getByRole('button', { name: 'Accept selected fields' }));
    await waitFor(() => expect(checkpoint).toHaveBeenCalled());
    act(() =>
      usePromptStudioDraftStore
        .getState()
        .setArtifact(editStudioVariant(source, 0, { prompt: 'Edited during checkpoint' })),
    );
    await act(async () => finish(true));
    await screen.findByRole('alert');
    expect(screen.getByRole('textbox', { name: 'Primary prompt' })).toHaveValue(
      'Edited during checkpoint',
    );
  });

  it('keeps the current pack when a required checkpoint fails', async () => {
    const { user } = await openStudio();
    await buildPack(user);
    const source = usePromptStudioDraftStore.getState().draft!.artifact!;
    vi.spyOn(usePromptStudioDraftStore.getState(), 'checkpoint').mockResolvedValue(false);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Target' }), 'sora');
    await screen.findByRole('alert');
    expect(usePromptStudioDraftStore.getState().draft!.artifact).toEqual(source);
    expect(usePromptStudioDraftStore.getState().draft!.video.target).toBe('flow-veo');
  });

  it('preserves locked lyrics exactly through proposal review and acceptance', async () => {
    const { user } = await openStudio();
    await user.click(screen.getByRole('button', { name: 'Music & Lyrics' }));
    await user.type(await screen.findByRole('textbox', { name: 'Song idea / story' }), 'Home');
    await user.click(screen.getByText('Music details and original lyrics', { exact: true }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Your lyrics (optional)' }), {
      target: { value: '[Verse]\nOld verse\n\n[Chorus]\nMy locked chorus\n' },
    });
    await user.click(screen.getByRole('button', { name: 'Build copy-ready pack' }));
    await screen.findByRole('textbox', { name: 'Primary lyrics' });
    await user.click(screen.getByText('Revise lyrics with AI', { exact: true }));
    await user.click(screen.getByRole('checkbox', { name: 'Lock this section' }));
    const original = usePromptStudioDraftStore.getState().draft!.artifact!;
    const locked = (original.primary as { lyrics: string }).lyrics.split('[Chorus]')[1];
    mocks.optimizeMusic.mockResolvedValue(
      compileMusicPromptArtifact({
        topic: 'Home',
        language: 'English',
        lyrics: '[Verse]\nNew verse\n\n[Chorus]\nAI changed chorus',
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Improve full package' }));
    await screen.findByRole('button', { name: 'Accept changes' });
    expect(usePromptStudioDraftStore.getState().draft!.artifact).toEqual(original);
    await user.click(screen.getByRole('button', { name: 'Accept changes' }));
    await waitFor(() => expect(usePromptStudioDraftStore.getState().status).toBe('saved'));
    const accepted = usePromptStudioDraftStore.getState().draft!;
    for (const variant of [accepted.artifact!.primary, ...accepted.artifact!.alternatives])
      expect((variant as { lyrics: string }).lyrics.split('[Chorus]')[1]).toBe(locked);
    expect(accepted.lockedSections).toContain('[Chorus]');
  });

  it('shows live token metrics, primary diff on alternatives, and guards no-op local transforms', async () => {
    const { user } = await openStudio();
    await buildPack(user, 'A cyclist rides across a misty bridge');
    expect(screen.getByText(/estimated tokens/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cinematic' }));
    expect(screen.getByText('Compare with Primary')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Cinematic prompt' }), {
      target: { value: 'Already compact prompt.' },
    });
    await user.click(screen.getByText('Improve selected variant', { exact: true }));
    await user.click(screen.getByRole('button', { name: 'Clean & Compact' }));
    expect(screen.getByText('Selected variant already matches this rule.')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Review selected variant changes' })).toBeNull();
  });

  it('previews and accepts local zero-token music transforms while preserving locked sections', async () => {
    const { user } = await openStudio();
    await user.click(screen.getByRole('button', { name: 'Music & Lyrics' }));
    await user.type(
      await screen.findByRole('textbox', { name: 'Song idea / story' }),
      'Night drive',
    );
    await user.click(screen.getByRole('button', { name: 'Build copy-ready pack' }));
    const lyricsBox = await screen.findByRole('textbox', { name: 'Primary lyrics' });
    expect(screen.getByText(/\/ 200 chars/)).toBeInTheDocument();
    fireEvent.change(lyricsBox, {
      target: { value: 'verse 1:\nRaw line\n[Chorus]\nKeep chorus intact' },
    });
    await user.click(screen.getByText('Revise lyrics with AI', { exact: true }));
    await user.click(screen.getByRole('button', { name: 'Normalize Section Tags' }));
    await screen.findByRole('button', { name: 'Accept changes' });
    await user.click(screen.getByRole('button', { name: 'Accept changes' }));
    await waitFor(() => expect(usePromptStudioDraftStore.getState().status).toBe('saved'));
    expect(screen.getByRole('textbox', { name: 'Primary lyrics' })).toHaveValue(
      '[Verse 1]\nRaw line\n[Chorus]\nKeep chorus intact',
    );
  });

  it('uses result notes as context for the current prompt and defaults to prompt-only edits', async () => {
    const firstView = await openStudio();
    await buildPack(firstView.user);
    fireEvent.change(screen.getByRole('textbox', { name: 'Primary prompt' }), {
      target: { value: 'The latest manually edited prompt' },
    });
    await waitFor(() => expect(usePromptStudioDraftStore.getState().status).toBe('saved'));
    const current = usePromptStudioDraftStore.getState().draft!.artifact!;
    firstView.unmount();

    const navigation: StudioFeedbackNavigationState = {
      kind: 'studio-feedback',
      source: {
        projectId: 'studio-test',
        sourceKind: 'external-result',
        sourceId: 'reviewed-result',
        variantIndex: 0,
        target: 'flow-veo',
        prompt: 'Frozen prompt from the reviewed video',
        negativePrompt: 'Frozen source exclusions',
        settings: '{"durationSeconds":8}',
        notes: 'Keep the subject framing and soften the camera move.',
      },
    };
    const { user } = await openStudioWithNavigationState(navigation);
    await screen.findByRole('region', { name: 'Improve prompt from notes' });
    expect(screen.getByRole('textbox', { name: 'Reviewer notes' })).toHaveValue(
      navigation.source.notes,
    );
    expect(
      within(screen.getByRole('region', { name: 'Improve prompt from notes' })).getByRole(
        'combobox',
        { name: 'Fields to improve' },
      ),
    ).toHaveValue('prompt');
    const feedbackReview = screen.getByRole('region', { name: 'Improve prompt from notes' });
    expect(
      within(feedbackReview).getByRole('checkbox', { name: 'Allow dialogue rewriting' }),
    ).not.toBeChecked();
    mocks.variantEdit.mockResolvedValue(variantProposalFor(current));
    await user.click(screen.getByRole('button', { name: 'Propose prompt changes' }));
    await screen.findByRole('region', { name: 'Review selected variant changes' });

    const request = mocks.variantEdit.mock.calls[0][0];
    expect(request).toMatchObject({
      variantIndex: 0,
      fields: ['prompt'],
      allowDialogueRewrite: false,
    });
    expect(request.artifact.primary.prompt).toBe('The latest manually edited prompt');
    expect(request.direction).toContain(navigation.source.notes);
    expect(request.direction).toContain(navigation.source.prompt);
    expect(request.direction).toContain(navigation.source.settings);
  });

  it('cancels a pending feedback proposal when another reviewed result opens', async () => {
    const firstView = await openStudio();
    await buildPack(firstView.user);
    const current = usePromptStudioDraftStore.getState().draft!.artifact!;
    firstView.unmount();
    const first: StudioFeedbackNavigationState = {
      kind: 'studio-feedback',
      source: {
        projectId: 'studio-test',
        sourceKind: 'production-take',
        sourceId: 'take-a',
        variantIndex: 0,
        target: 'flow-veo',
        prompt: 'Frozen prompt A',
        negativePrompt: '',
        settings: '{}',
        notes: 'Notes from result A',
      },
    };
    const second: StudioFeedbackNavigationState = {
      ...first,
      source: {
        ...first.source,
        sourceId: 'take-b',
        prompt: 'Frozen prompt B',
        notes: 'Notes from result B',
      },
    };
    let finish!: (result: VideoVariantEditResult) => void;
    mocks.variantEdit.mockReturnValueOnce(
      new Promise<VideoVariantEditResult>((resolve) => {
        finish = resolve;
      }),
    );
    const { user } = await openStudioWithNavigationState(first, second);
    await screen.findByRole('region', { name: 'Improve prompt from notes' });
    await user.click(screen.getByRole('button', { name: 'Propose prompt changes' }));
    await waitFor(() => expect(mocks.variantEdit).toHaveBeenCalledTimes(1));
    const firstSignal = mocks.variantEdit.mock.calls[0][0].signal as AbortSignal;

    await user.click(screen.getByRole('button', { name: 'Open next reviewed result' }));
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: 'Reviewer notes' })).toHaveValue(
        'Notes from result B',
      ),
    );
    expect(firstSignal.aborted).toBe(true);
    await act(async () => finish(variantProposalFor(current)));
    expect(screen.queryByRole('region', { name: 'Review selected variant changes' })).toBeNull();
    expect(screen.getByRole('textbox', { name: 'Reviewer notes' })).toHaveValue(
      'Notes from result B',
    );
  });

  it('invalidates feedback proposals when notes or rewrite options change', async () => {
    const firstView = await openStudio();
    await buildPack(firstView.user);
    const current = usePromptStudioDraftStore.getState().draft!.artifact!;
    firstView.unmount();
    const state: StudioFeedbackNavigationState = {
      kind: 'studio-feedback',
      source: {
        projectId: 'studio-test',
        sourceKind: 'external-result',
        sourceId: 'reviewed-result',
        variantIndex: 0,
        target: 'flow-veo',
        prompt: 'Frozen source',
        negativePrompt: '',
        settings: '{}',
        notes: 'Initial notes',
      },
    };
    let finish!: (result: VideoVariantEditResult) => void;
    mocks.variantEdit
      .mockReturnValueOnce(
        new Promise<VideoVariantEditResult>((resolve) => {
          finish = resolve;
        }),
      )
      .mockResolvedValueOnce(variantProposalFor(current));
    const { user } = await openStudioWithNavigationState(state);
    const feedback = screen.getByRole('region', { name: 'Improve prompt from notes' });
    await user.click(within(feedback).getByRole('button', { name: 'Propose prompt changes' }));
    await waitFor(() => expect(mocks.variantEdit).toHaveBeenCalledTimes(1));
    const signal = mocks.variantEdit.mock.calls[0][0].signal as AbortSignal;
    await user.click(within(feedback).getByRole('checkbox', { name: 'Allow dialogue rewriting' }));
    expect(signal.aborted).toBe(true);
    await act(async () => finish(variantProposalFor(current)));
    expect(screen.queryByRole('region', { name: 'Review selected variant changes' })).toBeNull();

    await user.click(within(feedback).getByRole('button', { name: 'Propose prompt changes' }));
    await screen.findByRole('region', { name: 'Review selected variant changes' });
    fireEvent.change(within(feedback).getByRole('textbox', { name: 'Reviewer notes' }), {
      target: { value: 'Updated notes after proposal' },
    });
    expect(screen.queryByRole('region', { name: 'Review selected variant changes' })).toBeNull();
  });

  it.each(['project', 'target'] as const)(
    'blocks feedback from a different %s',
    async (mismatch) => {
      const firstView = await openStudio();
      await buildPack(firstView.user);
      firstView.unmount();
      const source: StudioFeedbackNavigationState = {
        kind: 'studio-feedback',
        source: {
          projectId: mismatch === 'project' ? 'other-project' : 'studio-test',
          sourceKind: 'external-result',
          sourceId: 'reviewed-result',
          variantIndex: 0,
          target: mismatch === 'target' ? 'kling' : 'flow-veo',
          prompt: 'Frozen source',
          negativePrompt: '',
          settings: '{}',
          notes: 'Review notes',
        },
      };
      await openStudioWithNavigationState(source);
      const feedback = screen.getByRole('region', { name: 'Improve prompt from notes' });
      expect(
        within(feedback).getByText(/requires the same project and prompt target/),
      ).toBeVisible();
      expect(
        within(feedback).getByRole('button', { name: 'Propose prompt changes' }),
      ).toBeDisabled();
    },
  );

  it('labels the image-to-video primary field as motion and compiles its value', async () => {
    const { user } = await openStudio();
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Prompt recipe' }),
      'image-to-video',
    );
    const motion = screen.getByRole('textbox', { name: 'Describe the motion' });
    expect(motion).toHaveAttribute(
      'placeholder',
      'Describe what moves in the image and how it moves.',
    );
    fireEvent.change(motion, { target: { value: 'The bird spreads its wings' } });
    await user.click(screen.getByRole('button', { name: 'Build copy-ready pack' }));
    const result = await screen.findByRole('textbox', { name: 'Primary prompt' });
    expect((result as HTMLTextAreaElement).value).toContain(
      'Subject motion: The bird spreads its wings',
    );
  });

  it('selects and locks repeated choruses independently without duplicate option identities', async () => {
    const { user } = await openStudio();
    await user.click(screen.getByRole('button', { name: 'Music & Lyrics' }));
    await user.type(await screen.findByRole('textbox', { name: 'Song idea / story' }), 'Home');
    await user.click(screen.getByRole('button', { name: 'Build copy-ready pack' }));
    const box = await screen.findByRole('textbox', { name: 'Primary lyrics' });
    fireEvent.change(box, {
      target: { value: '[Chorus]\nFirst hook\n\n[Verse]\nMiddle\n\n[Chorus]\nSecond hook' },
    });
    await user.click(screen.getByText('Revise lyrics with AI', { exact: true }));
    const selector = screen.getByRole('combobox', { name: 'Section' });
    await user.selectOptions(selector, '[Chorus] #2');
    await user.click(screen.getByRole('checkbox', { name: 'Lock this section' }));
    expect(usePromptStudioDraftStore.getState().draft!.lockedSections).toContain('[Chorus] #2');
    await user.selectOptions(selector, '[Chorus] #1');
    expect(screen.getByRole('checkbox', { name: 'Lock this section' })).not.toBeChecked();
    await user.selectOptions(selector, '[Chorus] #2');
    expect(screen.getByRole('checkbox', { name: 'Lock this section' })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Rewrite section' })).toBeDisabled();
    fireEvent.change(box, { target: { value: 'Unsectioned text' } });
    expect(screen.getByRole('checkbox', { name: 'Lock this section' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Rewrite section' })).toBeDisabled();
  });

  it('expands scene details with AI and updates the video draft', async () => {
    const { user } = await openStudio();
    await user.type(
      await screen.findByRole('textbox', { name: 'Core idea' }),
      'A programmer rejected for vibecoding',
    );
    const expandBtn = screen.getByRole('button', { name: 'Expand scene details with AI' });
    await user.click(expandBtn);

    await waitFor(() => {
      expect(mocks.expandScene).toHaveBeenCalled();
    });
    expect(usePromptStudioDraftStore.getState().draft!.video.subject).toBe('AI-generated subject');
    expect(usePromptStudioDraftStore.getState().draft!.video.action).toBe('AI-generated action');
  });

  it('expands music details with AI and updates the music draft', async () => {
    const { user } = await openStudio();
    await user.click(screen.getByRole('button', { name: 'Music & Lyrics' }));
    await user.type(
      await screen.findByRole('textbox', { name: 'Song idea / story' }),
      'Rainy train',
    );
    const expandBtn = screen.getByRole('button', { name: 'Expand music details with AI' });
    await user.click(expandBtn);

    await waitFor(() => {
      expect(mocks.expandMusic).toHaveBeenCalled();
    });
    expect(usePromptStudioDraftStore.getState().draft!.music.genre).toBe('AI-generated genre');
    expect(usePromptStudioDraftStore.getState().draft!.music.lyrics).toContain('AI lyrics');
  });
});
