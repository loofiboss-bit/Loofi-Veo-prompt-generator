import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@/test-utils';
import { i18n } from '@core/config/i18n';
import { useLocation } from 'react-router';
import { StartPage } from './StartPage';
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
});
