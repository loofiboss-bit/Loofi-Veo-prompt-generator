import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AnimaticPlayer } from './AnimaticPlayer';
import type { Shot } from '@core/types';

describe('AnimaticPlayer', () => {
  const mockShots: Shot[] = [
    {
      id: 1,
      type: 'video',
      action: 'Courier runs across neon rooftop',
      camera: 'dolly push-in',
      duration: 4,
      characterId: 'char-1',
      takes: [],
      selectedTakeIndex: 0,
      visualLink: false,
      transition: { type: 'cut', duration: 0 },
    },
    {
      id: 2,
      type: 'video',
      action: 'Detective peers through rainy window',
      camera: 'dutch angle tracking',
      duration: 3,
      characterId: 'char-2',
      takes: [],
      selectedTakeIndex: 0,
      visualLink: false,
      transition: { type: 'cut', duration: 0 },
      dialogue: 'We are out of time.',
    },
  ];

  it('renders player header, timecode, and shot action', () => {
    render(<AnimaticPlayer shots={mockShots} />);

    expect(screen.getByText('Previz Animatic Player')).toBeInTheDocument();
    expect(screen.getByText(/00:00\.00/)).toBeInTheDocument();
    expect(screen.getByText('Courier runs across neon rooftop')).toBeInTheDocument();
  });

  it('toggles between 3D Previz and 2D Storyboard modes', () => {
    render(<AnimaticPlayer shots={mockShots} />);

    const modeBtn = screen.getByRole('button', { name: /3D Previz/i });
    expect(modeBtn).toBeInTheDocument();

    fireEvent.click(modeBtn);
    expect(screen.getByRole('button', { name: /2D Storyboard/i })).toBeInTheDocument();
  });

  it('toggles 3D Rig Viewport when 3D Rig button is clicked', () => {
    render(<AnimaticPlayer shots={mockShots} />);

    const rigBtn = screen.getByRole('button', { name: /3D Rig/i });
    fireEvent.click(rigBtn);

    expect(screen.getByText('3D Staging Viewport')).toBeInTheDocument();
  });

  it('renders shot overlay with 3D lens and trajectory info in 3D Previz mode', () => {
    render(<AnimaticPlayer shots={mockShots} />);

    expect(screen.getByText('SHOT #1')).toBeInTheDocument();
    expect(screen.getByText(/push-in/i)).toBeInTheDocument();
  });

  it('allows snapping cuts to BPM beat grid when callback provided', () => {
    const handleUpdate = vi.fn();
    render(<AnimaticPlayer shots={mockShots} bpm={120} onUpdateShots={handleUpdate} />);

    const snapBtn = screen.getByRole('button', { name: /Snap Cuts/i });
    fireEvent.click(snapBtn);

    expect(handleUpdate).toHaveBeenCalled();
  });
});
