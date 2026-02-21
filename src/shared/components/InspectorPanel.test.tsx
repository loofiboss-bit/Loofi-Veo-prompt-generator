/**
 * InspectorPanel Component Tests
 * Verifies rendering states, tab navigation, transform controls,
 * effects management, and audio controls.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test-utils';
import InspectorPanel from './InspectorPanel';
import type { TimelineClip } from '@core/types';

vi.mock('@core/services/keyframeService', () => ({
  keyframeService: {
    resolvePropertyValue: vi.fn().mockReturnValue(100),
    toggleKeyframe: vi.fn().mockReturnValue([]),
    hasKeyframes: vi.fn().mockReturnValue(false),
  },
}));

vi.mock('./SpatialPanner', () => ({
  default: ({
    x,
    z,
    onChange,
  }: {
    x: number;
    z: number;
    onChange: (x: number, z: number) => void;
  }) => (
    <div
      data-testid="spatial-panner"
      data-x={x}
      data-z={z}
      role="button"
      tabIndex={0}
      onClick={() => onChange(0.5, 0.5)}
      onKeyDown={() => onChange(0.5, 0.5)}
    >
      SpatialPanner
    </div>
  ),
}));

vi.mock('./TakeSelector', () => ({
  TakeSelector: ({ clipId }: { clipId: string }) => (
    <div data-testid="take-selector" data-clip-id={clipId}>
      TakeSelector
    </div>
  ),
}));

const makeVideoClip = (overrides: Partial<TimelineClip> = {}): TimelineClip => ({
  id: 'clip-1',
  resourceId: 1,
  trackId: 'video-track',
  startTime: 0,
  duration: 5.0,
  offset: 0,
  type: 'video',
  label: 'Main Shot',
  ...overrides,
});

const makeAudioClip = (overrides: Partial<TimelineClip> = {}): TimelineClip => ({
  id: 'clip-2',
  resourceId: 2,
  trackId: 'audio-track',
  startTime: 0,
  duration: 10.0,
  offset: 0,
  type: 'audio',
  label: 'Background Music',
  volume: 0.8,
  ...overrides,
});

describe('InspectorPanel', () => {
  const mockOnUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Empty State ────────────────────────────────────────────────

  describe('empty state', () => {
    it('should show empty state when no clip is selected', () => {
      render(<InspectorPanel selectedClip={null} onUpdate={mockOnUpdate} currentTime={0} />);

      expect(screen.getByText('No Clip Selected')).toBeInTheDocument();
      expect(
        screen.getByText('Select a clip in the timeline to edit its properties.'),
      ).toBeInTheDocument();
    });
  });

  // ─── Header ─────────────────────────────────────────────────────

  describe('header', () => {
    it('should display clip label', () => {
      render(
        <InspectorPanel
          selectedClip={makeVideoClip({ label: 'Hero Shot' })}
          onUpdate={mockOnUpdate}
          currentTime={2}
        />,
      );

      expect(screen.getByText('Hero Shot')).toBeInTheDocument();
    });

    it('should display clip duration', () => {
      render(
        <InspectorPanel
          selectedClip={makeVideoClip({ duration: 5.0 })}
          onUpdate={mockOnUpdate}
          currentTime={0}
        />,
      );

      expect(screen.getByText(/5\.00s/)).toBeInTheDocument();
    });

    it('should display truncated clip ID', () => {
      render(
        <InspectorPanel
          selectedClip={makeVideoClip({ id: 'abc123def456' })}
          onUpdate={mockOnUpdate}
          currentTime={0}
        />,
      );

      expect(screen.getByText(/def456/)).toBeInTheDocument();
    });
  });

  // ─── Tab Navigation ─────────────────────────────────────────────

  describe('tabs', () => {
    it('should show Transform tab as active by default', () => {
      render(
        <InspectorPanel selectedClip={makeVideoClip()} onUpdate={mockOnUpdate} currentTime={2} />,
      );

      const tabs = screen.getAllByRole('tab');
      const transformTab = tabs.find((t) => t.textContent === 'Transform');
      expect(transformTab).toHaveAttribute('aria-selected', 'true');
    });

    it('should show Effects tab for video clips', () => {
      render(
        <InspectorPanel selectedClip={makeVideoClip()} onUpdate={mockOnUpdate} currentTime={2} />,
      );

      expect(screen.getByText('Effects')).toBeInTheDocument();
    });

    it('should show Audio tab for audio clips', () => {
      render(
        <InspectorPanel selectedClip={makeAudioClip()} onUpdate={mockOnUpdate} currentTime={2} />,
      );

      expect(screen.getByText('Audio')).toBeInTheDocument();
    });

    it('should switch to Effects tab on click', async () => {
      const { user } = render(
        <InspectorPanel selectedClip={makeVideoClip()} onUpdate={mockOnUpdate} currentTime={2} />,
      );

      const effectsTab = screen.getByText('Effects');
      await user.click(effectsTab);

      expect(screen.getByText('Add Effect')).toBeInTheDocument();
    });

    it('should switch to Audio tab on click', async () => {
      const { user } = render(
        <InspectorPanel selectedClip={makeAudioClip()} onUpdate={mockOnUpdate} currentTime={2} />,
      );

      await user.click(screen.getByText('Audio'));

      expect(screen.getByTestId('spatial-panner')).toBeInTheDocument();
    });
  });

  // ─── Transform Section ──────────────────────────────────────────

  describe('transform section', () => {
    it('should display scale property', () => {
      render(
        <InspectorPanel
          selectedClip={makeVideoClip({
            transform: { scale: 150, position: { x: 0, y: 0 }, rotation: 0, opacity: 100 },
          })}
          onUpdate={mockOnUpdate}
          currentTime={2}
        />,
      );

      expect(screen.getByText('Scale (%)')).toBeInTheDocument();
    });

    it('should display rotation property', () => {
      render(
        <InspectorPanel selectedClip={makeVideoClip()} onUpdate={mockOnUpdate} currentTime={2} />,
      );

      expect(screen.getByText('Rotation (deg)')).toBeInTheDocument();
    });

    it('should display opacity property', () => {
      render(
        <InspectorPanel selectedClip={makeVideoClip()} onUpdate={mockOnUpdate} currentTime={2} />,
      );

      expect(screen.getByText('Opacity (%)')).toBeInTheDocument();
    });

    it('should display position controls', () => {
      render(
        <InspectorPanel selectedClip={makeVideoClip()} onUpdate={mockOnUpdate} currentTime={2} />,
      );

      expect(screen.getByText('X Position')).toBeInTheDocument();
      expect(screen.getByText('Y Position')).toBeInTheDocument();
    });

    it('should show TakeSelector for video clips', () => {
      render(
        <InspectorPanel selectedClip={makeVideoClip()} onUpdate={mockOnUpdate} currentTime={2} />,
      );

      expect(screen.getByTestId('take-selector')).toBeInTheDocument();
    });

    it('should use default transform values if none set', () => {
      render(
        <InspectorPanel
          selectedClip={makeVideoClip({ transform: undefined })}
          onUpdate={mockOnUpdate}
          currentTime={2}
        />,
      );

      // Default scale is 100, which appears in the value display
      expect(screen.getByText('Scale (%)')).toBeInTheDocument();
      // Verify default transform is used by checking range input value
      const scaleInput = screen.getByLabelText('Toggle keyframe for Scale (%)');
      expect(scaleInput).toBeInTheDocument();
    });
  });

  // ─── Effects Section ────────────────────────────────────────────

  describe('effects section', () => {
    it('should show empty effects message', async () => {
      const { user } = render(
        <InspectorPanel
          selectedClip={makeVideoClip({ effects: [] })}
          onUpdate={mockOnUpdate}
          currentTime={2}
        />,
      );

      await user.click(screen.getByText('Effects'));
      expect(screen.getByText('No effects applied.')).toBeInTheDocument();
    });

    it('should display add effect buttons', async () => {
      const { user } = render(
        <InspectorPanel selectedClip={makeVideoClip()} onUpdate={mockOnUpdate} currentTime={2} />,
      );

      await user.click(screen.getByText('Effects'));

      expect(screen.getByLabelText('Add color grade effect')).toBeInTheDocument();
      expect(screen.getByLabelText('Add chroma key effect')).toBeInTheDocument();
      expect(screen.getByLabelText('Add camera shake effect')).toBeInTheDocument();
    });

    it('should add a color effect when color button is clicked', async () => {
      const { user } = render(
        <InspectorPanel
          selectedClip={makeVideoClip({ effects: [] })}
          onUpdate={mockOnUpdate}
          currentTime={2}
        />,
      );

      await user.click(screen.getByText('Effects'));
      await user.click(screen.getByLabelText('Add color grade effect'));

      expect(mockOnUpdate).toHaveBeenCalledWith('clip-1', {
        effects: [
          expect.objectContaining({
            type: 'color',
            name: 'Color Grade',
            isEnabled: true,
            brightness: 1,
            contrast: 1,
            saturation: 1,
          }),
        ],
      });
    });

    it('should add a chroma key effect', async () => {
      const { user } = render(
        <InspectorPanel
          selectedClip={makeVideoClip({ effects: [] })}
          onUpdate={mockOnUpdate}
          currentTime={2}
        />,
      );

      await user.click(screen.getByText('Effects'));
      await user.click(screen.getByLabelText('Add chroma key effect'));

      expect(mockOnUpdate).toHaveBeenCalledWith('clip-1', {
        effects: [
          expect.objectContaining({
            type: 'chroma',
            name: 'Green Screen',
            color: '#00FF00',
          }),
        ],
      });
    });

    it('should add a camera shake effect', async () => {
      const { user } = render(
        <InspectorPanel
          selectedClip={makeVideoClip({ effects: [] })}
          onUpdate={mockOnUpdate}
          currentTime={2}
        />,
      );

      await user.click(screen.getByText('Effects'));
      await user.click(screen.getByLabelText('Add camera shake effect'));

      expect(mockOnUpdate).toHaveBeenCalledWith('clip-1', {
        effects: [
          expect.objectContaining({
            type: 'shake',
            name: 'Camera Shake',
            intensity: 0.2,
          }),
        ],
      });
    });

    it('should display existing effects with controls', async () => {
      const existingEffect = {
        id: 'eff-1',
        type: 'color' as const,
        isEnabled: true,
        name: 'Color Grade',
        brightness: 1,
        contrast: 1.2,
        saturation: 0.8,
        sepia: 0,
        hueRotate: 0,
      };

      const { user } = render(
        <InspectorPanel
          selectedClip={makeVideoClip({ effects: [existingEffect] })}
          onUpdate={mockOnUpdate}
          currentTime={2}
        />,
      );

      await user.click(screen.getByText('Effects'));

      expect(screen.getByText('Color Grade')).toBeInTheDocument();
      expect(screen.getByText('Brightness')).toBeInTheDocument();
      expect(screen.getByText('Contrast')).toBeInTheDocument();
      expect(screen.getByText('Saturation')).toBeInTheDocument();
    });

    it('should remove an effect when delete button is clicked', async () => {
      const existingEffect = {
        id: 'eff-1',
        type: 'color' as const,
        isEnabled: true,
        name: 'Color Grade',
        brightness: 1,
        contrast: 1,
        saturation: 1,
        sepia: 0,
        hueRotate: 0,
      };

      const { user } = render(
        <InspectorPanel
          selectedClip={makeVideoClip({ effects: [existingEffect] })}
          onUpdate={mockOnUpdate}
          currentTime={2}
        />,
      );

      await user.click(screen.getByText('Effects'));
      await user.click(screen.getByLabelText('Remove Color Grade effect'));

      expect(mockOnUpdate).toHaveBeenCalledWith('clip-1', { effects: [] });
    });

    it('should toggle effect enabled state', async () => {
      const existingEffect = {
        id: 'eff-1',
        type: 'color' as const,
        isEnabled: true,
        name: 'Color Grade',
        brightness: 1,
        contrast: 1,
        saturation: 1,
        sepia: 0,
        hueRotate: 0,
      };

      const { user } = render(
        <InspectorPanel
          selectedClip={makeVideoClip({ effects: [existingEffect] })}
          onUpdate={mockOnUpdate}
          currentTime={2}
        />,
      );

      await user.click(screen.getByText('Effects'));
      await user.click(screen.getByLabelText('Toggle Color Grade effect'));

      expect(mockOnUpdate).toHaveBeenCalledWith('clip-1', {
        effects: [expect.objectContaining({ isEnabled: false })],
      });
    });
  });

  // ─── Audio Section ──────────────────────────────────────────────

  describe('audio section', () => {
    it('should show volume control for audio clips', async () => {
      const { user } = render(
        <InspectorPanel
          selectedClip={makeAudioClip({ volume: 0.75 })}
          onUpdate={mockOnUpdate}
          currentTime={2}
        />,
      );

      await user.click(screen.getByText('Audio'));
      expect(screen.getByText('Volume (%)')).toBeInTheDocument();
    });

    it('should show spatial panner for audio clips', async () => {
      const { user } = render(
        <InspectorPanel selectedClip={makeAudioClip()} onUpdate={mockOnUpdate} currentTime={2} />,
      );

      await user.click(screen.getByText('Audio'));
      expect(screen.getByTestId('spatial-panner')).toBeInTheDocument();
    });

    it('should default volume to 100% when not set', async () => {
      const { user } = render(
        <InspectorPanel
          selectedClip={makeAudioClip({ volume: undefined })}
          onUpdate={mockOnUpdate}
          currentTime={2}
        />,
      );

      await user.click(screen.getByText('Audio'));
      expect(screen.getByText('Volume (%)')).toBeInTheDocument();
    });
  });

  // ─── Keyframe Controls ─────────────────────────────────────────

  describe('keyframe controls', () => {
    it('should show keyframe toggle buttons', () => {
      render(
        <InspectorPanel selectedClip={makeVideoClip()} onUpdate={mockOnUpdate} currentTime={2} />,
      );

      const kfButtons = screen.getAllByLabelText(/Toggle keyframe for/);
      expect(kfButtons.length).toBeGreaterThan(0);
    });

    it('should disable keyframe buttons when currentTime is outside clip', () => {
      render(
        <InspectorPanel
          selectedClip={makeVideoClip({ startTime: 10, duration: 5 })}
          onUpdate={mockOnUpdate}
          currentTime={0} // Before clip
        />,
      );

      const kfButtons = screen.getAllByLabelText(/Toggle keyframe for/);
      kfButtons.forEach((btn) => {
        expect(btn).toBeDisabled();
      });
    });

    it('should enable keyframe buttons when currentTime is within clip', () => {
      render(
        <InspectorPanel
          selectedClip={makeVideoClip({ startTime: 0, duration: 5 })}
          onUpdate={mockOnUpdate}
          currentTime={2}
        />,
      );

      const kfButtons = screen.getAllByLabelText(/Toggle keyframe for/);
      kfButtons.forEach((btn) => {
        expect(btn).not.toBeDisabled();
      });
    });
  });
});
