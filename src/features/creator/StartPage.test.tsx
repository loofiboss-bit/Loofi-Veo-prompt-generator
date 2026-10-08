import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@/test-utils';
import { i18n } from '@core/config/i18n';
import { StartPage } from './StartPage';
const creator = vi.hoisted(() => ({
  busy: false,
  error: null,
  notice: null,
  profiles: [],
  recent: [],
  initialize: vi.fn().mockResolvedValue(undefined),
  create: vi.fn().mockResolvedValue(true),
  open: vi.fn().mockResolvedValue(true),
  saveStyle: vi.fn(),
  applyStyle: vi.fn().mockResolvedValue(true),
  saveTemplate: vi.fn(),
}));
vi.mock('@core/store/useCreatorStore', () => ({
  useCreatorStore: Object.assign(() => creator, { getState: () => creator }),
}));
vi.mock('@features/onboarding/WelcomeModal', () => ({ WelcomeModal: () => null }));
describe('creator start', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.clear();
    await i18n.changeLanguage('en');
  });
  it('opens complete offline examples without keys and shows all twelve local recipes', async () => {
    const { user } = render(<StartPage />);
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
  it('requires a style preview and explicit approval before applying', async () => {
    const { user } = render(<StartPage />);
    expect(screen.queryByRole('button', { name: 'Apply to this project' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Preview on current project' }));
    expect(creator.applyStyle).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Apply to this project' }));
    expect(creator.applyStyle).toHaveBeenCalledWith(
      expect.objectContaining({ fontFamily: 'Noto Sans', primaryColor: '#173d56' }),
    );
  });
  it('persists the preferred startup page', async () => {
    const { user } = render(<StartPage />);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Open the app on' }), '/studio');
    expect(localStorage.getItem('creator-default-start-view')).toBe('/studio');
  });
});
