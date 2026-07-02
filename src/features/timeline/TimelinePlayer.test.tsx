import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test-utils';
import TimelinePlayer from './TimelinePlayer';
import type { Shot } from '@core/types';

const {
  mockSetCurrentTime,
  mockSyncTimelineFromShots,
  mockUpdateTimelineClip,
  mockUpdateShot,
  mockStartGeneration,
  mockGetResolveDirectExportReadiness,
  mockDirectExportToResolve,
} = vi.hoisted(() => ({
  mockSetCurrentTime: vi.fn(),
  mockSyncTimelineFromShots: vi.fn(),
  mockUpdateTimelineClip: vi.fn(),
  mockUpdateShot: vi.fn(),
  mockStartGeneration: vi.fn(),
  mockGetResolveDirectExportReadiness: vi.fn(),
  mockDirectExportToResolve: vi.fn(),
}));

vi.mock('@core/store/useAppStore', () => ({
  useAppStore: () => ({
    tracks: [],
    clips: [
      {
        id: 'video_1',
        resourceId: 1,
        type: 'video',
        duration: 5,
      },
    ],
    zoomLevel: 1,
    currentTime: 0,
    setCurrentTime: mockSetCurrentTime,
    syncTimelineFromShots: mockSyncTimelineFromShots,
    updateTimelineClip: mockUpdateTimelineClip,
    updateShot: mockUpdateShot,
  }),
}));

vi.mock('@shared/hooks/useVideoGeneration', () => ({
  useVideoGeneration: () => ({
    startGeneration: mockStartGeneration,
  }),
}));

vi.mock('@core/services/nleDirectExportService', () => ({
  getResolveDirectExportReadiness: mockGetResolveDirectExportReadiness,
  directExportToResolve: mockDirectExportToResolve,
}));

vi.mock('./components/Timeline', () => ({
  default: () => <div data-testid="timeline-component" />,
}));

vi.mock('@shared/components/FilterControls', () => ({
  default: () => null,
}));

vi.mock('@shared/components/ChromaKeyPanel', () => ({
  default: () => null,
}));

vi.mock('@shared/components/AudioMixer', () => ({
  default: () => null,
}));

vi.mock('@shared/components/VFXPanel', () => ({
  default: () => null,
}));

vi.mock('@shared/components/InspectorPanel', () => ({
  default: () => null,
}));

vi.mock('@features/history/HistoryControls', () => ({
  default: () => null,
}));

vi.mock('@shared/hooks/useHotkeys', () => ({
  useHotkeys: vi.fn(),
}));

vi.mock('@core/services/audioAnalysisService', () => ({
  createSpatialPanner: vi.fn(),
  updateSpatialPanner: vi.fn(),
  getFrequencyEnergy: vi.fn().mockReturnValue(0),
}));

vi.mock('@core/utils/cameraPhysics', () => ({
  calculateCameraTransform: vi.fn().mockReturnValue(''),
}));

vi.mock('@core/utils/easing', () => ({
  getEasedValue: vi.fn().mockReturnValue(0),
}));

vi.mock('@core/services/effectPipeline', () => ({
  applyFilmEmulation: vi.fn(),
}));

const shotFixture: Shot = {
  id: 1,
  type: 'video',
  action: 'Test action',
  camera: 'Static',
  characterId: 'char-1',
  generatedVideoUrl: 'https://example.com/video.mp4',
  takes: [],
  selectedTakeIndex: 0,
  visualLink: false,
  duration: 5,
  transition: {
    type: 'cut',
    duration: 0,
  },
};

class MockAudioContext {
  state: 'running' | 'suspended' = 'running';

  close = vi.fn().mockResolvedValue(undefined);
  resume = vi.fn().mockResolvedValue(undefined);
  suspend = vi.fn().mockResolvedValue(undefined);
  createMediaElementSource = vi.fn().mockReturnValue({
    connect: vi.fn(),
  });
  createAnalyser = vi.fn().mockReturnValue({
    fftSize: 0,
    connect: vi.fn(),
  });
}

describe('TimelinePlayer direct export flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () => null as unknown as CanvasRenderingContext2D,
    );

    Object.defineProperty(window, 'AudioContext', {
      value: MockAudioContext,
      writable: true,
      configurable: true,
    });

    Object.defineProperty(window, 'webkitAudioContext', {
      value: MockAudioContext,
      writable: true,
      configurable: true,
    });
  });

  it('shows direct export hint and disables direct option when readiness fails', async () => {
    mockGetResolveDirectExportReadiness.mockResolvedValue({
      ready: false,
      message: 'Direct Export is available only in the desktop app. Use standard file export.',
      reason: 'unsupported_environment',
      retryable: false,
    });

    const { user } = render(<TimelinePlayer shots={[shotFixture]} onClose={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /export/i }));

    expect(
      await screen.findByText(/Direct Export is available only in the desktop app/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Direct Export to DaVinci Resolve/i }),
    ).toBeDisabled();
    expect(mockGetResolveDirectExportReadiness).toHaveBeenCalledTimes(1);
  }, 15_000);

  it('surfaces service failure message when direct export execution fails', async () => {
    mockGetResolveDirectExportReadiness.mockResolvedValue({
      ready: true,
      message: 'DaVinci Resolve is ready for direct export.',
      retryable: true,
    });

    mockDirectExportToResolve.mockResolvedValue({
      success: false,
      message: 'DaVinci Resolve is not running. Open it and retry, or use file export.',
      fallbackSuggested: true,
      reason: 'nle_not_running',
      retryable: true,
    });

    const { user } = render(<TimelinePlayer shots={[shotFixture]} onClose={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /export/i }));
    await screen.findByText(/Export Video/i);

    await user.click(screen.getByRole('button', { name: /Direct Export to DaVinci Resolve/i }));
    await user.click(screen.getByRole('button', { name: /Send to Resolve/i }));

    expect(mockDirectExportToResolve).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByText(/DaVinci Resolve is not running\. Open it and retry/i),
    ).toBeInTheDocument();
  }, 15_000);
});
