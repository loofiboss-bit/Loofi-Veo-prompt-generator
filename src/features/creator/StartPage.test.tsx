import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@/test-utils';
import { i18n } from '@core/config/i18n';
import { useLocation } from 'react-router';
import { StartPage } from './StartPage';
import { useProjectStore } from '@core/store/useProjectStore';
import { useProjectSaveStore } from '@core/store/useProjectSaveStore';
import { useEditorSessionStore } from '@core/store/useEditorSessionStore';
import { useAppStore } from '@core/store/useAppStore';
import { useTimelineRecoveryStore } from '@core/store/useTimelineRecoveryStore';
import { usePromptStudioDraftStore } from '@core/store/usePromptStudioDraftStore';
const creator = vi.hoisted(() => ({
  busy: false,
  error: null,
  notice: null,
  profiles: [],
  recent: [],
  initialize: vi.fn().mockResolvedValue(undefined),
  create: vi.fn().mockResolvedValue(true),
  createFromFiles: vi.fn().mockResolvedValue(true),
  open: vi.fn().mockResolvedValue(true),
  saveStyle: vi.fn(),
  applyStyle: vi.fn().mockResolvedValue(true),
  saveTemplate: vi.fn(),
}));
vi.mock('@core/store/useCreatorStore', () => ({
  useCreatorStore: Object.assign(() => creator, { getState: () => creator }),
}));
vi.mock('@features/onboarding/WelcomeModal', () => ({ WelcomeModal: () => null }));

function CurrentLocation() {
  const location = useLocation();
  return <output data-testid="current-location">{location.pathname + location.search}</output>;
}
describe('creator start', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.clear();
    useProjectStore.setState({ currentProjectId: null, projects: [] });
    useProjectSaveStore.setState({ projects: {} });
    useEditorSessionStore.setState({ projectSnapshot: null });
    useTimelineRecoveryStore.setState({ recovery: null });
    usePromptStudioDraftStore.setState({ draft: null, status: 'loading', error: null });
    useAppStore.getState().resetAll();
    await i18n.changeLanguage('en');
  });
  it('opens complete offline examples without keys and shows all twelve local recipes', async () => {
    const { user } = render(<StartPage />);
    await user.click(screen.getByText('Try it offline — no account or API key'));
    await user.click(screen.getByRole('heading', { name: 'Start with a creative recipe' }));
    expect(screen.getAllByRole('button', { name: 'Open example' })).toHaveLength(3);
    expect(screen.getAllByRole('button', { pressed: false })).toHaveLength(11);
    await user.click(screen.getAllByRole('button', { name: 'Open example' })[0]);
    await waitFor(() =>
      expect(creator.create).toHaveBeenCalledWith(
        expect.objectContaining({ exampleId: 'social' }),
        expect.any(String),
        expect.any(String),
        true,
      ),
    );
    expect(screen.queryByRole('textbox', { name: /API/i })).not.toBeInTheDocument();
  });
  it('shows three user goals and keeps navigation separate from generation', async () => {
    const { user } = render(
      <>
        <StartPage />
        <CurrentLocation />
      </>,
    );
    expect(screen.getByRole('group', { name: 'Choose how to begin' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Open video prompts' }));
    expect(screen.getByTestId('current-location')).toHaveTextContent('/studio?mode=video');
    expect(creator.create).not.toHaveBeenCalled();
    expect(creator.createFromFiles).not.toHaveBeenCalled();
  });
  it('persists the preferred startup page', async () => {
    const { user } = render(<StartPage />);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Open the app on' }), '/studio');
    expect(localStorage.getItem('creator-default-start-view')).toBe('/studio');
  });
  it('opens and focuses recipes from the shortcut', async () => {
    const { user } = render(<StartPage />);
    await user.click(screen.getByRole('button', { name: 'Start with a creative recipe' }));
    expect(
      screen.getByRole('heading', { name: 'Start with a creative recipe' }).closest('details'),
    ).toHaveAttribute('open');
    expect(
      screen.getByRole('heading', { name: 'Start with a creative recipe' }).closest('summary'),
    ).toHaveFocus();
  });
  it('directs save conflicts to the recovery controls', async () => {
    useProjectStore.setState({
      currentProjectId: 'p',
      projects: [{ id: 'p', name: 'Edit' } as never],
    });
    useProjectSaveStore.setState({ projects: { p: { status: 'conflict' } } });
    const recovery = document.createElement('div');
    recovery.id = 'project-save-recovery';
    recovery.tabIndex = -1;
    document.body.appendChild(recovery);
    const { user } = render(<StartPage />);
    await user.click(screen.getByRole('button', { name: 'Review save issue' }));
    expect(recovery).toHaveFocus();
    recovery.remove();
  });
  it('directs a failing current Studio draft back to Studio', async () => {
    useProjectStore.setState({
      currentProjectId: 'p',
      projects: [{ id: 'p', name: 'Edit' } as never],
    });
    usePromptStudioDraftStore.setState({ draft: { projectId: 'p' } as never, status: 'error' });
    const { user } = render(
      <>
        <StartPage />
        <CurrentLocation />
      </>,
    );
    await user.click(screen.getByRole('button', { name: 'Review Studio draft' }));
    expect(screen.getByTestId('current-location')).toHaveTextContent('/studio');
  });
  it('continues image-only editor projects in the timeline', async () => {
    useProjectStore.setState({
      currentProjectId: 'p',
      projects: [{ id: 'p', name: 'Edit' } as never],
    });
    useEditorSessionStore.setState({
      projectSnapshot: { id: 'p', creatorDelivery: { editorMode: 'delivery' } } as never,
    });
    useAppStore.setState({ assets: [{ id: 'img', type: 'image' } as never], clips: [] });
    const { user } = render(
      <>
        <StartPage />
        <CurrentLocation />
      </>,
    );
    await user.click(screen.getByRole('button', { name: 'Continue in Timeline' }));
    expect(screen.getByTestId('current-location')).toHaveTextContent('/timeline');
  });
  it('offers relinking only while the missing-media check is current', () => {
    useProjectStore.setState({
      currentProjectId: 'p',
      projects: [{ id: 'p', name: 'Edit' } as never],
    });
    useAppStore.setState({
      clips: [{ id: 'clip', label: 'Opening', type: 'video' } as never],
      assets: [],
      sbShots: [],
    });
    const app = useAppStore.getState();
    useTimelineRecoveryStore.getState().setRecovery({
      projectId: 'p',
      mutationVersion: app.mutationVersion,
      run: null,
      clips: app.clips,
      assets: app.assets,
      shots: app.sbShots,
      missingMedia: [{ clipId: 'clip', clipLabel: 'Opening', mediaKey: 'missing' }],
    });
    render(<StartPage />);
    expect(screen.getByRole('button', { name: 'Relink missing media' })).toBeInTheDocument();
    act(() => useAppStore.setState({ clips: [...app.clips] }));
    expect(screen.queryByRole('button', { name: 'Relink missing media' })).not.toBeInTheDocument();
  });
});
