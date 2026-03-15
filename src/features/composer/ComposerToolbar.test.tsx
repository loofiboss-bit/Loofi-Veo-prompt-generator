import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test-utils';
import { ROUTES } from '@core/config/routes';

import { ComposerToolbar } from './ComposerToolbar';

const mockNavigate = vi.fn();
const mockStartComposerTutorial = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@shared/contexts/OnboardingContext', () => ({
  useOnboarding: () => ({
    startComposerTutorial: mockStartComposerTutorial,
  }),
}));

const composerStoreState = {
  viewport: { zoom: 1 },
  snapToGrid: false,
  showMinimap: false,
  autoLayout: false,
  blocks: [],
  connections: [],
  connectionStyle: 'bezier',
  zoomIn: vi.fn(),
  zoomOut: vi.fn(),
  zoomToFit: vi.fn(),
  resetViewport: vi.fn(),
  toggleSnapToGrid: vi.fn(),
  toggleMinimap: vi.fn(),
  toggleAutoLayout: vi.fn(),
  setConnectionStyle: vi.fn(),
  applyAutoLayout: vi.fn(),
  clearCanvas: vi.fn(),
  selectAll: vi.fn(),
  removeSelectedBlocks: vi.fn(),
  saveSnapshot: vi.fn(),
  evaluate: vi.fn(),
};

vi.mock('@core/store/useComposerStore', () => ({
  useComposerStore: (selector?: (state: typeof composerStoreState) => unknown) =>
    selector ? selector(composerStoreState) : composerStoreState,
}));

describe('ComposerToolbar', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockStartComposerTutorial.mockReset();
  });

  it('returns to the prompt builder when the back button is clicked', async () => {
    const { user } = render(<ComposerToolbar />);

    await user.click(screen.getByRole('button', { name: /back to prompt builder/i }));

    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.HOME);
  });
});
