import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ProductionTake } from '@core/types';
import { TakeCompare } from './TakeCompare';

const take = (id: string, score: number): ProductionTake => ({
  id,
  prompt: 'Tracking shot',
  request: {
    mode: 'text-to-video',
    modelId: 'veo-3.1-fast',
    prompt: 'Tracking shot',
    aspectRatio: '16:9',
    resolution: '720p',
    durationSeconds: 8,
    referenceAssetIds: [],
  },
  status: 'complete',
  provider: 'gemini-api',
  apiSurface: 'google-ai-v1beta',
  modelLifecycleSnapshot: 'preview',
  priceDimension: { unit: 'video-second', resolution: '720p', usdPerUnit: 0.1 },
  localMediaUrl: `file:///take-${id}.mp4`,
  review: {
    id: `review-${id}`,
    shotId: 1,
    takeId: id,
    overallScore: score,
    dimensions: [
      { id: 'prompt-adherence', score, summary: 'Matches the approved shot.' },
      { id: 'motion', score: score - 5, summary: 'Motion remains coherent.' },
    ],
    findings: [],
    source: 'local',
    createdAt: 1,
  },
  createdAt: 1,
});

describe('TakeCompare', () => {
  it('provides keyboard-accessible A/B playback, notes, and decisions', () => {
    const onKeep = vi.fn();
    const onReject = vi.fn();
    const onRevise = vi.fn();
    render(
      <TakeCompare
        takes={[take('a', 70), take('b', 91)]}
        onKeep={onKeep}
        onReject={onReject}
        onRevise={onRevise}
      />,
    );
    expect(screen.getAllByText(/Score:/)).toHaveLength(2);
    expect(screen.getAllByText('prompt adherence')).toHaveLength(2);
    expect(screen.getAllByText('motion')).toHaveLength(2);
    expect(document.querySelectorAll('video')).toHaveLength(2);
    fireEvent.change(screen.getByLabelText('Comparison notes'), {
      target: { value: 'Preserve subject identity.' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: 'Keep' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Reject' })[1]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Revise' })[0]);
    expect(onKeep).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }));
    expect(onReject).toHaveBeenCalledWith(expect.objectContaining({ id: 'b' }));
    expect(onRevise).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'a' }),
      'Preserve subject identity.',
    );
  });
});
