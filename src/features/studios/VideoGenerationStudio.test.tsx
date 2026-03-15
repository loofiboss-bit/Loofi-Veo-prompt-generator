import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@/test-utils';
import VideoGenerationStudio from './VideoGenerationStudio';

const { mockStartGeneration, mockHasSelectedApiKey, mockOpenSelectKey, mockVideoState } =
  vi.hoisted(() => ({
    mockStartGeneration: vi.fn(),
    mockHasSelectedApiKey: vi.fn(),
    mockOpenSelectKey: vi.fn(),
    mockVideoState: {
      tasks: [],
      isGenerating: false,
    },
  }));

vi.mock('@core/services/videoGenerationService', () => ({
  videoGenerationService: {
    startGeneration: mockStartGeneration,
  },
}));

vi.mock('@core/store/useVideoStore', () => ({
  useVideoStore: (selector: (state: typeof mockVideoState) => unknown) => selector(mockVideoState),
}));

describe('VideoGenerationStudio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVideoState.tasks = [];
    mockVideoState.isGenerating = false;
    mockStartGeneration.mockResolvedValue('task-1');
    mockHasSelectedApiKey.mockResolvedValue(true);
    mockOpenSelectKey.mockResolvedValue(undefined);

    Object.defineProperty(window, 'aistudio', {
      configurable: true,
      value: {
        hasSelectedApiKey: mockHasSelectedApiKey,
        openSelectKey: mockOpenSelectKey,
      },
    });
  });

  it('disables generation for whitespace-only prompts', () => {
    render(<VideoGenerationStudio onClose={vi.fn()} addToast={vi.fn()} language="en" />);

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: '   ' },
    });

    expect(screen.getByRole('button', { name: /generate/i })).toBeDisabled();
  });

  it('retries generation after the user selects an API key', async () => {
    const addToast = vi.fn();
    mockHasSelectedApiKey.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    render(<VideoGenerationStudio onClose={vi.fn()} addToast={addToast} language="en" />);

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'A neon fox sprinting through rainy city streets' },
    });

    fireEvent.click(screen.getByRole('button', { name: /generate/i }));

    expect(await screen.findByText(/unlock veo video generation/i)).toBeInTheDocument();
    expect(mockStartGeneration).not.toHaveBeenCalled();
    expect(addToast).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /select key & continue/i }));

    await waitFor(() => {
      expect(mockOpenSelectKey).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(mockStartGeneration).toHaveBeenCalledWith(
        'A neon fox sprinting through rainy city streets',
        expect.objectContaining({
          aspectRatio: '16:9',
          resolution: '1080p',
          veoModel: 'fast',
          count: 1,
        }),
        undefined,
        expect.any(Function),
      );
    });
  });
});
