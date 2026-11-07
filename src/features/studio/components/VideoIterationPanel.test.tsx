import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@/test-utils';
import { VideoIterationPanel } from './VideoIterationPanel';
import type { VideoIterationSession } from '@core/types/videoIteration';
import { videoIterationService } from '@core/services/videoIterationService';
import { useAppStore } from '@core/store/useAppStore';

describe('VideoIterationPanel', () => {
  let mockSession: VideoIterationSession;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(videoIterationService, 'saveSession').mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(async () => {});

    mockSession = {
      id: 'session-test-1',
      projectId: 'proj-1',
      artifactId: 'art-1',
      variantIndex: 0,
      rootAssetId: 'asset-v1',
      activeTurnId: 'turn-1',
      turns: [
        {
          id: 'turn-1',
          version: 1,
          parentId: null,
          instruction: 'Initial generation',
          effectivePrompt: 'Initial cinematic shot of a sunset',
          assetId: 'asset-v1',
          assetUrl: 'blob:video-v1',
          settings: {
            durationSeconds: 5,
            resolution: '720p',
            aspectRatio: '16:9',
            modelId: 'gemini-omni-1.1-flash',
          },
          costEstimateUsd: 0,
          createdAt: 1730491200000,
        },
      ],
      updatedAt: 1730491200000,
    };

    useAppStore.setState({
      sbShots: [
        {
          id: 1,
          action: 'Sunset scene',
          dialogue: '',
          camera: 'Wide shot',
          duration: 5,
          type: 'video',
          characterId: 'char-1',
          selectedTakeIndex: 0,
          visualLink: false,
          transition: { type: 'cut', duration: 0 },
          takes: [],
        },
      ],
    });
  });

  it('renders initial version pill, video player, and instructions form', () => {
    const handleSessionUpdated = vi.fn();
    render(
      <VideoIterationPanel
        initialSession={mockSession}
        idea="Sunset scene over a calm ocean"
        onSessionUpdated={handleSessionUpdated}
      />,
    );

    expect(screen.getByText(/AI Video Iteration/i)).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /v1/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Change lighting to golden hour/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /v2/i })).toBeInTheDocument();
  });

  it('updates instructions input and triggers iteration generation', async () => {
    const handleSessionUpdated = vi.fn();
    const updatedSession: VideoIterationSession = {
      ...mockSession,
      activeTurnId: 'turn-2',
      turns: [
        mockSession.turns[0],
        {
          id: 'turn-2',
          version: 2,
          parentId: 'turn-1',
          instruction: 'Make the camera push in closer',
          effectivePrompt: 'Initial cinematic shot of a sunset, Make the camera push in closer',
          assetId: 'asset-v2',
          assetUrl: 'blob:video-v2',
          settings: {
            durationSeconds: 5,
            resolution: '720p',
            aspectRatio: '16:9',
            modelId: 'gemini-omni-1.1-flash',
          },
          costEstimateUsd: 0.8,
          createdAt: 1730491500000,
        },
      ],
    };

    const iterateSpy = vi.spyOn(videoIterationService, 'iterateVideo').mockResolvedValue({
      session: updatedSession,
      turn: updatedSession.turns[1],
    });

    render(
      <VideoIterationPanel
        initialSession={mockSession}
        idea="Sunset scene over a calm ocean"
        onSessionUpdated={handleSessionUpdated}
      />,
    );

    const input = screen.getByPlaceholderText(/Change lighting to golden hour/i);
    fireEvent.change(input, { target: { value: 'Make the camera push in closer' } });

    const submitBtn = screen.getByRole('button', { name: /v2/i });
    expect(submitBtn).not.toBeDisabled();
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(iterateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          session: mockSession,
          instruction: 'Make the camera push in closer',
          parentTurnId: 'turn-1',
        }),
      );
      expect(handleSessionUpdated).toHaveBeenCalledWith(
        expect.objectContaining({
          activeTurnId: 'turn-2',
          turns: expect.arrayContaining([
            expect.objectContaining({ version: 1 }),
            expect.objectContaining({ version: 2 }),
          ]),
        }),
      );
    });
  });

  it('switches between versions when multiple turns exist', async () => {
    const multiSession: VideoIterationSession = {
      ...mockSession,
      activeTurnId: 'turn-2',
      turns: [
        mockSession.turns[0],
        {
          id: 'turn-2',
          version: 2,
          parentId: 'turn-1',
          instruction: 'Close up view',
          effectivePrompt: 'Close up view',
          assetId: 'asset-v2',
          assetUrl: 'blob:video-v2',
          settings: {
            durationSeconds: 5,
            resolution: '720p',
            aspectRatio: '16:9',
            modelId: 'gemini-omni-1.1-flash',
          },
          costEstimateUsd: 0.8,
          createdAt: 1730491500000,
        },
      ],
    };

    const handleSessionUpdated = vi.fn();
    render(
      <VideoIterationPanel
        initialSession={multiSession}
        idea="Sunset scene"
        onSessionUpdated={handleSessionUpdated}
      />,
    );

    const v1Btn = screen.getByRole('tab', { name: /v1/i });
    fireEvent.click(v1Btn);

    await waitFor(() => {
      expect(handleSessionUpdated).toHaveBeenCalledWith(
        expect.objectContaining({
          activeTurnId: 'turn-1',
        }),
      );
    });
  });

  it('toggles A/B comparison when multiple versions exist', () => {
    const multiSession: VideoIterationSession = {
      ...mockSession,
      activeTurnId: 'turn-2',
      turns: [
        mockSession.turns[0],
        {
          id: 'turn-2',
          version: 2,
          parentId: 'turn-1',
          instruction: 'Golden hour lighting',
          effectivePrompt: 'Golden hour lighting',
          assetId: 'asset-v2',
          assetUrl: 'blob:video-v2',
          settings: {
            durationSeconds: 5,
            resolution: '720p',
            aspectRatio: '16:9',
            modelId: 'gemini-omni-1.1-flash',
          },
          costEstimateUsd: 0.8,
          createdAt: 1730491500000,
        },
      ],
    };

    const handleSessionUpdated = vi.fn();
    render(
      <VideoIterationPanel
        initialSession={multiSession}
        idea="Sunset scene"
        onSessionUpdated={handleSessionUpdated}
      />,
    );

    const compareBtn = screen.getByRole('button', { name: /Compare versions/i });
    expect(compareBtn).toBeInTheDocument();
    fireEvent.click(compareBtn);

    // Verify comparison view is shown
    expect(screen.getByRole('region', { name: /video comparison/i })).toBeInTheDocument();
  });

  it('applies version to storyboard shot on timeline', () => {
    const handleSessionUpdated = vi.fn();
    render(
      <VideoIterationPanel
        initialSession={mockSession}
        idea="Sunset scene"
        onSessionUpdated={handleSessionUpdated}
      />,
    );

    const applyBtn = screen.getByRole('button', { name: /Send to Timeline/i });
    fireEvent.click(applyBtn);

    const shots = useAppStore.getState().sbShots;
    expect(shots[0].takes).toBeDefined();
    expect(shots[0].takes?.length).toBe(1);
    expect(shots[0].takes?.[0]).toBe('blob:video-v1');
    expect(shots[0].videoUrl).toBe('blob:video-v1');
    expect(screen.getByText(/sent to storyboard scene 1/i)).toBeInTheDocument();
  });

  it('supports extend mode (+3–10s), audio regeneration toggle, and empty Storyboard auto-creation', async () => {
    useAppStore.setState({ sbShots: [] });
    const iterateSpy = vi.spyOn(videoIterationService, 'iterateVideo').mockResolvedValue({
      session: mockSession,
      turn: mockSession.turns[0],
    });

    render(<VideoIterationPanel initialSession={mockSession} idea="Sunset scene" />);

    const extendBtn = screen.getByRole('button', { name: /Extend clip/i });
    fireEvent.click(extendBtn);
    expect(extendBtn).toHaveAttribute('aria-pressed', 'true');

    const audioCheckbox = screen.getByRole('checkbox');
    fireEvent.click(audioCheckbox);
    expect(audioCheckbox).not.toBeChecked();

    const input = screen.getByPlaceholderText(/Change lighting to golden hour/i);
    fireEvent.change(input, { target: { value: 'Continue camera pan across the horizon' } });

    const submitBtn = screen.getByRole('button', { name: /\(v2\)/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(iterateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: expect.objectContaining({
            mode: 'extend',
            keepAudio: false,
            modelId: 'gemini-omni-1.2-flash',
          }),
        }),
      );
    });

    const applyBtn = screen.getByRole('button', { name: /Send to Timeline/i });
    fireEvent.click(applyBtn);

    const state = useAppStore.getState();
    expect(state.sbShots).toHaveLength(1);
    expect(state.sbShots[0].videoUrl).toBe('blob:video-v1');
  });
});
