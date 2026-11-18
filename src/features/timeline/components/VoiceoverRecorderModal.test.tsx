import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test-utils';
import { VoiceoverRecorderModal } from './VoiceoverRecorderModal';

describe('VoiceoverRecorderModal', () => {
  const mockTrack = {
    stop: vi.fn(),
  };
  const mockStream = {
    active: true,
    getTracks: () => [mockTrack],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue(mockStream),
        enumerateDevices: vi
          .fn()
          .mockResolvedValue([{ deviceId: 'mic-1', kind: 'audioinput', label: 'Built-in Mic' }]),
      },
      writable: true,
      configurable: true,
    });

    // Mock HTMLCanvasElement getContext
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
    }) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  });

  it('renders modal when open with default playhead position', () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <VoiceoverRecorderModal isOpen={true} onClose={onClose} currentTime={5.4} />,
    );

    expect(screen.getByText('Record Voiceover')).toBeInTheDocument();
    expect(screen.getByText('5.4s')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start recording/i })).toBeInTheDocument();
    rerender(<VoiceoverRecorderModal isOpen onClose={onClose} currentTime={9.2} />);
    expect(screen.getByText('5.4s')).toBeInTheDocument();
  });

  it('calls onClose when clicking close or cancel button', async () => {
    const onClose = vi.fn();
    const { user } = render(
      <VoiceoverRecorderModal isOpen={true} onClose={onClose} currentTime={0} />,
    );

    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('displays error message if microphone access is denied', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockRejectedValue(new Error('Permission denied')),
        enumerateDevices: vi.fn().mockResolvedValue([]),
      },
      writable: true,
      configurable: true,
    });

    const onClose = vi.fn();
    const { user } = render(
      <VoiceoverRecorderModal isOpen={true} onClose={onClose} currentTime={0} />,
    );

    const startBtn = screen.getByRole('button', { name: /start recording/i });
    await user.click(startBtn);

    expect(await screen.findByText('Permission denied')).toBeInTheDocument();
  });
});
