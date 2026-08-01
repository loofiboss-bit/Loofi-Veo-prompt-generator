import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router';
import { ROUTES } from '@core/config/routes';
import { i18n } from '@core/config/i18n';
import { SettingsPage } from './SettingsPage';

const mockNavigate = vi.fn();
const mockUpdateSettings = vi.fn();

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@shared/hooks/useViewport', () => ({
  useViewport: () => ({
    isCompact: false,
  }),
}));

vi.mock('./updates/components/UpdateSettings', () => ({
  UpdateSettings: () => <div>Update Settings Panel</div>,
}));

vi.mock('./desktop/components/DesktopSettings', () => ({
  DesktopSettings: () => <div>Desktop Settings Panel</div>,
}));

vi.mock('@features/plugins/components/PluginList', () => ({
  default: () => <div>Plugin List Panel</div>,
}));

vi.mock('@features/plugins/components/MarketplacePanel', () => ({
  MarketplacePanel: () => <div>Marketplace Panel</div>,
}));

vi.mock('./ApiKeyModal', () => ({
  ApiKeyModal: () => <div>API Key Modal</div>,
}));

vi.mock('@core/store/useSettingsStore', () => ({
  useSettingsStore: () => ({
    registryUrl: '',
    promptGenerationProvider: 'gemini',
    localLlmEndpoint: 'http://localhost:11434',
    localLlmModel: 'llama3',
    enableExperimentalFeatures: false,
    updateSettings: mockUpdateSettings,
  }),
}));

vi.mock('@core/services/registryService', () => ({
  registryService: {
    configure: vi.fn(),
  },
}));

vi.mock('@core/services/ollamaProvider', () => ({
  checkOllamaHealth: vi.fn().mockResolvedValue({ ok: true, message: 'healthy' }),
}));

vi.mock('@core/services/themeService', () => ({
  ACCENT_PRESETS: {
    cyan: { hue: 190, saturation: 90, label: 'Cyan' },
  },
  themeService: {
    getAccent: vi.fn(() => 'cyan'),
    setAccent: vi.fn().mockResolvedValue(undefined),
    setMode: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@shared/components/ui/Icon', () => ({
  default: () => <span aria-hidden="true" />,
}));

vi.mock('@core/store/useAppStore', () => ({
  useAppStore: () => ({
    theme: 'dark',
    setTheme: vi.fn(),
  }),
}));

function renderSettingsPage(initialEntry: string) {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <SettingsPage />
      </MemoryRouter>
    </I18nextProvider>,
  );
}

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens the plugins tab when requested via the URL query string', () => {
    renderSettingsPage('/settings?tab=plugins');

    expect(screen.getByText('Plugin List Panel')).toBeInTheDocument();
    expect(screen.queryByText('Marketplace Panel')).not.toBeInTheDocument();
  });

  it('falls back to the general tab when an invalid tab is requested', () => {
    renderSettingsPage('/settings?tab=not-a-real-tab');

    expect(screen.getByText('API Key Modal')).toBeInTheDocument();
    expect(screen.queryByText('Plugin List Panel')).not.toBeInTheDocument();
  });

  it('keeps help and experimental controls under Settings', () => {
    renderSettingsPage('/settings?tab=support');

    expect(screen.getByRole('heading', { name: 'Help' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open creator guide' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: /enable labs features/i }));
    expect(mockUpdateSettings).toHaveBeenCalledWith({ enableExperimentalFeatures: true });
  });

  it('navigates back to the prompt builder from the header button', async () => {
    renderSettingsPage(ROUTES.SETTINGS);

    fireEvent.click(screen.getByRole('button', { name: /back to prompt builder/i }));

    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.HOME);
  });
});
