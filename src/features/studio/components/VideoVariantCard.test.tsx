import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test-utils';
import { VideoVariantCard } from './VideoVariantCard';
import type { VideoPromptVariant } from '@core/types';

const MOCK_VARIANT: VideoPromptVariant = {
  label: 'Primary',
  title: 'Recommended Take',
  prompt: 'A sleek cyber vehicle cruises through rainy neon streets',
  negativePrompt: 'unintended text, glitches',
  settingsChecklist: ['Aspect Ratio: 16:9', 'Duration: 8s'],
  copyPrompt: 'A sleek cyber vehicle cruises through rainy neon streets',
  copyNegativePrompt: 'unintended text, glitches',
  copySettingsChecklist: 'Aspect Ratio: 16:9\nDuration: 8s',
  copyAll: 'Full copy-all text',
};

describe('VideoVariantCard', () => {
  it('renders variant title, prompt, and action buttons', () => {
    render(
      <VideoVariantCard variant={MOCK_VARIANT} primary onCopy={vi.fn()} onHandoff={vi.fn()} />,
    );

    expect(screen.getByText('Recommended Take')).toBeInTheDocument();
    expect(screen.getByDisplayValue(/cyber vehicle cruises/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Copy prompt/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Copy negative/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Copy checklist/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Copy handoff/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Generate in app/i })).toBeInTheDocument();
  });

  it('triggers copy callback when clicking copy prompt', async () => {
    const onCopy = vi.fn();
    const { user } = render(<VideoVariantCard variant={MOCK_VARIANT} primary onCopy={onCopy} />);

    await user.click(screen.getByRole('button', { name: /Copy prompt/i }));
    expect(onCopy).toHaveBeenCalledWith(MOCK_VARIANT.copyPrompt, 'Copied.');
  });

  it('collapses and expands on button click', async () => {
    const { user } = render(<VideoVariantCard variant={MOCK_VARIANT} primary onCopy={vi.fn()} />);

    const toggleButton = screen.getByRole('button', { name: /Collapse/i });
    await user.click(toggleButton);

    expect(screen.queryByDisplayValue(/cyber vehicle cruises/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Open/i })).toBeInTheDocument();
  });
});
