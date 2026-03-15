import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@/test-utils';
import type { SunoPack } from '@core/types';
import * as geminiService from '@core/services/geminiService';
import SunoSongStudio from './SunoSongStudio';

vi.mock('@core/services/geminiService', () => ({
  generateSunoPack: vi.fn(),
  extendSunoLyrics: vi.fn(),
}));

const MOCK_PACK: SunoPack = {
  title: 'Neon Dreams',
  style: 'Synthwave, dark, female vocals',
  lyrics: '[Verse]\nCity lights in the pouring rain',
  explanation: 'A moody synthwave song brief.',
};

describe('SunoSongStudio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    );
    vi.stubGlobal('open', vi.fn());
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn() },
      configurable: true,
    });
  });

  it('returns to an editable topic field after starting a new song', async () => {
    vi.mocked(geminiService.generateSunoPack).mockResolvedValue(MOCK_PACK);

    render(<SunoSongStudio onClose={vi.fn()} addToast={vi.fn()} />);

    const topicField = screen.getByLabelText(/song topic \/ story/i);
    fireEvent.change(topicField, {
      target: { name: 'topic', value: 'A midnight drive through neon rain', selectionStart: 32 },
    });

    fireEvent.click(screen.getByRole('button', { name: /generate pro asset pack/i }));

    expect(await screen.findByRole('button', { name: /new song/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /new song/i }));

    const topicFieldAfterReset = await screen.findByLabelText(/song topic \/ story/i);
    fireEvent.change(topicFieldAfterReset, {
      target: { name: 'topic', value: 'A brighter second draft after reset', selectionStart: 34 },
    });

    expect(topicFieldAfterReset).toHaveValue('A brighter second draft after reset');
  });

  it('resets manual-settings visibility when starting a new song', async () => {
    vi.mocked(geminiService.generateSunoPack).mockResolvedValue(MOCK_PACK);

    render(<SunoSongStudio onClose={vi.fn()} addToast={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/song topic \/ story/i), {
      target: { name: 'topic', value: 'A rooftop anthem at sunrise', selectionStart: 27 },
    });

    fireEvent.click(screen.getByRole('button', { name: /manual settings/i }));

    await waitFor(() => {
      expect(screen.getByText(/musical style/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /generate pro asset pack/i }));
    expect(await screen.findByRole('button', { name: /new song/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /new song/i }));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /manual settings \(optional\)/i }),
      ).toBeInTheDocument();
    });
    expect(screen.queryByText(/musical style/i)).not.toBeInTheDocument();
  });
});
