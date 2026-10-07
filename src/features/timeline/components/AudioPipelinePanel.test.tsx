import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AudioPipelinePanel } from './AudioPipelinePanel';
import { Shot } from '@core/types';
import { useAppStore } from '@core/store/useAppStore';

describe('AudioPipelinePanel', () => {
  const mockShots: Shot[] = [
    {
      id: 1,
      duration: 5,
      type: 'video',
      action: 'Kuriren springer och sparkar upp dörren',
      dialogue: 'Skynda dig!',
      camera: 'fpv-drone-dive',
      characterId: 'char-1',
      takes: [],
      selectedTakeIndex: 0,
      visualLink: false,
      transition: { type: 'cut', duration: 0 },
    },
  ];

  beforeEach(() => {
    useAppStore.setState({
      sbShots: mockShots,
      clips: [],
      assets: [],
    });
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <AudioPipelinePanel isOpen={false} onClose={vi.fn()} shots={mockShots} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders panel and auto-scans audio cues when open', async () => {
    render(<AudioPipelinePanel isOpen={true} onClose={vi.fn()} shots={mockShots} />);

    expect(screen.getByText('Foley & SFX Pipeline')).toBeInTheDocument();
    expect(screen.getByText('Multi-track ljudläggning & ducking')).toBeInTheDocument();

    // Auto-scan should detect dialogue, foley, and camera cues
    await waitFor(() => {
      expect(screen.getByText(/Skynda dig!/i)).toBeInTheDocument();
    });
  });

  it('filters cues when category tabs are clicked', async () => {
    render(<AudioPipelinePanel isOpen={true} onClose={vi.fn()} shots={mockShots} />);

    await waitFor(() => {
      expect(screen.getByText(/Skynda dig!/i)).toBeInTheDocument();
    });

    // Click 'dialogue' tab
    const dialogueTab = screen.getByRole('button', { name: /dialogue/i });
    fireEvent.click(dialogueTab);

    // Dialogue cue remains visible
    expect(screen.getByText(/Skynda dig!/i)).toBeInTheDocument();
  });

  it('synthesizes and places cues on timeline when execute button is clicked', async () => {
    render(<AudioPipelinePanel isOpen={true} onClose={vi.fn()} shots={mockShots} />);

    await waitFor(() => {
      expect(screen.getByText(/Syntetisera & Placera/i)).toBeInTheDocument();
    });

    const executeBtn = screen.getByRole('button', { name: /Syntetisera & Placera/i });
    fireEvent.click(executeBtn);

    await waitFor(() => {
      expect(screen.getByText(/Genererade och placerade/i)).toBeInTheDocument();
    });

    const store = useAppStore.getState();
    expect(store.clips.length).toBeGreaterThan(0);
    expect(store.assets.length).toBeGreaterThan(0);
  });

  it('clears audio tracks when clicking clear audio button', async () => {
    useAppStore.setState({
      clips: [
        {
          id: 'clip-sfx-1',
          resourceId: 'res-1',
          trackId: 'audio_sfx',
          startTime: 0,
          duration: 2,
          offset: 0,
          type: 'audio',
          label: 'Footsteps',
        },
      ],
    });

    render(<AudioPipelinePanel isOpen={true} onClose={vi.fn()} shots={mockShots} />);

    const clearBtn = screen.getByRole('button', { name: /Rensa ljudspår/i });
    fireEvent.click(clearBtn);

    await waitFor(() => {
      expect(screen.getByText(/Rensade 1 ljudklipp/i)).toBeInTheDocument();
    });

    expect(useAppStore.getState().clips.length).toBe(0);
  });
});
