import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test-utils';
import { MusicVariantCard } from './MusicVariantCard';
import type { MusicPromptVariant } from '@core/types';

const MOCK_MUSIC_VARIANT: MusicPromptVariant = {
  label: 'Primary',
  title: 'Neon Odyssey',
  styleOfMusic: 'synthwave, energetic, 120 bpm',
  lyrics: '[Verse]\nDriving in the night\n[Chorus]\nBlinded by the light',
  productionNotes: ['Voice: male tenor', 'Custom model: v5.5'],
  copyStyle: 'synthwave, energetic, 120 bpm',
  copyLyrics: '[Verse]\nDriving in the night\n[Chorus]\nBlinded by the light',
  copyAll: 'Full Suno Pack',
};

describe('MusicVariantCard', () => {
  it('renders music title, style, lyrics, and copy buttons', () => {
    render(
      <MusicVariantCard
        variant={MOCK_MUSIC_VARIANT}
        primary
        onCopy={vi.fn()}
        onLyricsChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Neon Odyssey')).toBeInTheDocument();
    expect(screen.getByDisplayValue(/synthwave, energetic/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue(/Driving in the night/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Copy style/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Copy lyrics/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Copy all/i })).toBeInTheDocument();
  });

  it('triggers copy callback for style and lyrics', async () => {
    const onCopy = vi.fn();
    const { user } = render(
      <MusicVariantCard variant={MOCK_MUSIC_VARIANT} primary onCopy={onCopy} />,
    );

    await user.click(screen.getByRole('button', { name: /Copy style/i }));
    expect(onCopy).toHaveBeenCalledWith(MOCK_MUSIC_VARIANT.copyStyle, 'Style copied');

    await user.click(screen.getByRole('button', { name: /Copy lyrics/i }));
    expect(onCopy).toHaveBeenCalledWith(MOCK_MUSIC_VARIANT.copyLyrics, 'Lyrics copied');
  });
});
