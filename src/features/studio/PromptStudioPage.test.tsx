import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test-utils';
import { PromptStudioPage } from './PromptStudioPage';

describe('PromptStudioPage', () => {
  let clipboardWriteText: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    clipboardWriteText = vi.fn().mockResolvedValue(undefined);
  });

  it('starts as a focused video copy desk and emits one primary plus two alternatives', async () => {
    const { user } = render(<PromptStudioPage />);
    const idea = screen.getByPlaceholderText(/courier crosses/i);
    expect(idea).toHaveFocus();
    await user.type(idea, 'A courier crosses a rainy neon street');
    await user.click(screen.getByRole('button', { name: /Build copy-ready pack/i }));

    expect(screen.getByRole('heading', { name: 'Prompt Studio' })).toBeInTheDocument();
    expect(screen.getByText('Recommended handoff')).toBeInTheDocument();
    expect(screen.getByText('Cinematic texture')).toBeInTheDocument();
    expect(screen.getAllByText('Control-focused').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /Copy prompt/i })).toHaveLength(1);
  });

  it('copies locally without opening an external provider during build', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const { user } = render(<PromptStudioPage />);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: clipboardWriteText },
    });
    await user.type(screen.getByPlaceholderText(/courier crosses/i), 'A single focused scene');
    await user.click(screen.getByRole('button', { name: /Build copy-ready pack/i }));
    await user.click(screen.getByRole('button', { name: /Copy prompt/i }));

    expect(clipboardWriteText).toHaveBeenCalled();
    expect(openSpy).not.toHaveBeenCalled();
    openSpy.mockRestore();
  });

  it('opens Suno only after a successful explicit copy action', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const { user } = render(<PromptStudioPage />);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: clipboardWriteText },
    });
    await user.click(screen.getByRole('button', { name: /Music & Lyrics/i }));
    await user.type(screen.getByPlaceholderText(/midnight train/i), 'A song about returning home');
    await user.click(screen.getByRole('button', { name: /Build copy-ready pack/i }));
    await user.click(screen.getByRole('button', { name: /Copy & Open Suno/i }));
    expect(clipboardWriteText).toHaveBeenCalled();
    expect(openSpy).toHaveBeenCalledWith(
      'https://suno.com/create',
      '_blank',
      'noopener,noreferrer',
    );
    openSpy.mockRestore();
  });

  it('surfaces clipboard failure without opening Suno', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const { user } = render(<PromptStudioPage />);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('Clipboard blocked')) },
    });
    await user.click(screen.getByRole('button', { name: /Music & Lyrics/i }));
    await user.type(screen.getByPlaceholderText(/midnight train/i), 'A song about returning home');
    await user.click(screen.getByRole('button', { name: /Build copy-ready pack/i }));
    await user.click(screen.getByRole('button', { name: /Copy & Open Suno/i }));
    expect(await screen.findByRole('status')).toHaveTextContent('Clipboard blocked');
    expect(openSpy).not.toHaveBeenCalled();
    openSpy.mockRestore();
  });

  it('switches to the Music & Lyrics mode through the studio route', async () => {
    const { user } = render(<PromptStudioPage />);
    await user.click(screen.getByRole('button', { name: /Music & Lyrics/i }));
    expect(screen.getByPlaceholderText(/midnight train/i)).toBeInTheDocument();
    expect(screen.getByText('Advanced handoff notes')).toBeInTheDocument();
  });
});
