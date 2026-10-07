import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test-utils';
import { ComfyUiSettingsSection } from './ComfyUiSettingsSection';
import * as comfyUiService from '@core/services/comfyUiService';
import { useSettingsStore } from '@core/store/useSettingsStore';

describe('ComfyUiSettingsSection', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useSettingsStore.getState().resetSettings();
  });

  it('renders section title and toggle button', () => {
    render(<ComfyUiSettingsSection />);

    expect(screen.getByText('Local ComfyUI GPU Engine')).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', { name: /Enable ComfyUI Local GPU Engine/i }),
    ).toBeInTheDocument();
  });

  it('shows configuration inputs when ComfyUI is enabled', async () => {
    const { user } = render(<ComfyUiSettingsSection />);

    const toggle = screen.getByRole('checkbox', { name: /Enable ComfyUI Local GPU Engine/i });
    await user.click(toggle);

    expect(screen.getByLabelText(/Enable ComfyUI Local GPU Engine/i)).toBeChecked();
    expect(screen.getByPlaceholderText('http://127.0.0.1:8188')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Test Connection/i })).toBeInTheDocument();
  });

  it('tests connection and displays GPU hardware statistics', async () => {
    vi.spyOn(comfyUiService, 'checkComfyUiHealth').mockResolvedValue({
      online: true,
      systemStats: {
        system: { os: 'linux', python_version: '3.11' },
        devices: [
          {
            name: 'NVIDIA RTX 4080',
            type: 'cuda',
            vram_total: 16384,
            vram_free: 14200,
          },
        ],
      },
    });

    useSettingsStore.getState().updateSettings({ comfyUiEnabled: true });
    const { user } = render(<ComfyUiSettingsSection />);

    await user.click(screen.getByRole('button', { name: /Test Connection/i }));

    expect(await screen.findByText('Connected to local ComfyUI instance')).toBeInTheDocument();
    expect(screen.getByText(/NVIDIA RTX 4080/)).toBeInTheDocument();
  });
});
