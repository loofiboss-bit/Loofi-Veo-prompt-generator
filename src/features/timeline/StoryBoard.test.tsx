import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes } from 'react-router';

import { i18n } from '@core/config/i18n';
import { ROUTES } from '@core/config/routes';
import { useAppStore } from '@core/store/useAppStore';

import StoryBoard from './StoryBoard';

vi.mock('@shared/hooks/useDirectorsChain', () => ({
  useDirectorsChain: vi.fn(),
}));

vi.mock('@shared/hooks/useCollaborativeProject', () => ({
  useCollaborativeProject: vi.fn(() => ({
    isConnected: false,
    connectToRoom: vi.fn(),
    disconnect: vi.fn(),
    activeUsers: [],
    roomId: null,
  })),
}));

vi.mock('@core/services/geminiService', () => ({
  bridgeScenes: vi.fn(),
  calculateColorGrade: vi.fn(),
}));

vi.mock('@core/services/videoGenerationService', () => ({
  videoGenerationService: {
    startGeneration: vi.fn(),
  },
}));

vi.mock('@core/services/upscaleService', () => ({
  upscaleVideo: vi.fn(),
}));

vi.mock('@core/utils/videoUtils', () => ({
  extractLastFrame: vi.fn(),
}));

vi.mock('@core/store/useLocationStore', () => ({
  useLocationStore: () => ({
    locations: [],
  }),
}));

vi.mock('./components/ShotCard', () => ({
  ShotCard: () => <div data-testid="shot-card" />,
}));

vi.mock('@shared/components/TableReadPlayer', () => ({
  default: () => <div data-testid="table-read-player" />,
}));

vi.mock('../studios/modals/AutoBlockerModal', () => ({
  default: () => null,
}));

vi.mock('../studios/modals/CameraPlotterModal', () => ({
  default: () => null,
}));

vi.mock('../studios/modals/WhiteboardModal', () => ({
  default: () => null,
}));

vi.mock('../studios/modals/InpaintingModal', () => ({
  default: () => null,
}));

vi.mock('../studios/modals/GenerativeCanvasModal', () => ({
  default: () => null,
}));

vi.mock('../studios/modals/RecordingBoothModal', () => ({
  default: () => null,
}));

vi.mock('../studios/modals/ScriptImportReviewModal', () => ({
  default: () => null,
}));

vi.mock('../studios/modals/TitleEditorModal', () => ({
  default: () => null,
}));

vi.mock('../studios/modals/PoseEditorModal', () => ({
  default: () => null,
}));

vi.mock('@shared/components/MotionCropEditor', () => ({
  default: () => null,
}));

vi.mock('../studios/modals/DubbingModal', () => ({
  default: () => null,
}));

vi.mock('../studios/modals/FoleyWizardModal', () => ({
  default: () => null,
}));

vi.mock('../studios/modals/MagicMaskModal', () => ({
  default: () => null,
}));

describe('StoryBoard', () => {
  beforeEach(() => {
    useAppStore.getState().resetAll();
    useAppStore.setState({
      credits: 100,
      promptState: {
        ...useAppStore.getState().promptState,
        uploadedAudio: null,
      },
    });
  });

  it('navigates to the timeline route from the header button', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <I18nextProvider i18n={i18n}>
        <MemoryRouter initialEntries={['/storyboard']}>
          <Routes>
            <Route
              path="/storyboard"
              element={<StoryBoard isOpen={true} onClose={onClose} addToast={vi.fn()} />}
            />
            <Route path={ROUTES.TIMELINE} element={<div>Timeline Route</div>} />
          </Routes>
        </MemoryRouter>
      </I18nextProvider>,
    );

    await user.click(screen.getByRole('button', { name: /timeline/i }));

    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.getByText('Timeline Route')).toBeInTheDocument();
  });

  it('safely closes and redirects to ROUTES.CREATE when batch generation cannot approve legacy paid tasks', async () => {
    const onClose = vi.fn();
    const addToast = vi.fn();
    const user = userEvent.setup();

    const { videoGenerationService } = await import('@core/services/videoGenerationService');
    vi.mocked(videoGenerationService.startGeneration).mockResolvedValue(null);

    useAppStore.setState({
      sbShots: [
        {
          id: 1,
          type: 'video',
          action: 'Hero leaps across rooftops',
          camera: 'Wide',
          characterId: 'char-1',
          takes: [],
          selectedTakeIndex: 0,
          visualLink: false,
          duration: 5,
          transition: { type: 'cut', duration: 0 },
        },
      ],
    });

    render(
      <I18nextProvider i18n={i18n}>
        <MemoryRouter initialEntries={['/storyboard']}>
          <Routes>
            <Route
              path="/storyboard"
              element={<StoryBoard isOpen={true} onClose={onClose} addToast={addToast} />}
            />
            <Route path={ROUTES.CREATE} element={<div>Create Route</div>} />
          </Routes>
        </MemoryRouter>
      </I18nextProvider>,
    );

    await user.click(screen.getByRole('button', { name: /batch generate/i }));

    expect(videoGenerationService.startGeneration).toHaveBeenCalledWith(
      expect.stringContaining('Hero leaps across rooftops'),
      expect.any(Object),
      undefined,
      expect.any(Function),
    );
    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.getByText('Create Route')).toBeInTheDocument();
    expect(addToast).not.toHaveBeenCalledWith('All shots queued in background studio.', 'success');
  });
});
