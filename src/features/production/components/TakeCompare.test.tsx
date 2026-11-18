import { fireEvent, render, screen } from '@/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProductionTake } from '@core/types';
import { TakeCompare } from './TakeCompare';

const mocks = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useNavigate: () => mocks.navigate,
}));

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
    source: 'gemini',
    createdAt: 1,
  },
  createdAt: 1,
});

beforeEach(() => {
  mocks.navigate.mockReset();
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
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
    expect(screen.getAllByText(/prompt adherence/)).toHaveLength(2);
    expect(screen.getAllByText(/^motion:/)).toHaveLength(2);
    expect(document.querySelectorAll('video')).toHaveLength(2);
    fireEvent.change(screen.getByLabelText('Comparison notes · A'), {
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
  it('opens Studio with the frozen take source and its current comparison notes', () => {
    const source = take('a', 70);
    source.sourceArtifactId = 'artifact-a';
    source.sourceVariantIndex = 2;
    render(
      <TakeCompare
        takes={[source]}
        projectId="project-a"
        feedbackTarget="flow-veo"
        onKeep={vi.fn()}
        onReject={vi.fn()}
        onRevise={vi.fn()}
      />,
    );
    const improve = screen.getByRole('button', { name: 'Improve prompt from notes' });
    expect(improve).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Comparison notes · A'), {
      target: { value: 'Keep the framing, soften the camera move.' },
    });
    fireEvent.click(improve);
    expect(mocks.navigate).toHaveBeenCalledWith(
      '/studio?mode=video',
      expect.objectContaining({
        state: {
          kind: 'studio-feedback',
          source: expect.objectContaining({
            projectId: 'project-a',
            sourceKind: 'production-take',
            sourceId: 'a',
            artifactId: 'artifact-a',
            variantIndex: 2,
            target: 'flow-veo',
            prompt: 'Tracking shot',
            negativePrompt: '',
            notes: 'Keep the framing, soften the camera move.',
            settings: expect.stringContaining('"model": "veo-3.1-fast"'),
          }),
        },
      }),
    );
  });
  it('shows local checks without quality scores and requires manual confirmation', () => {
    const local = take('local', 95);
    local.review!.source = 'local';
    local.review!.findings = [
      {
        id: 'warning',
        severity: 'warning',
        category: 'motion',
        message: 'Only metadata was checked.',
        timestampSeconds: 2,
      },
    ];
    const onManualReview = vi.fn();
    const onKeep = vi.fn();
    render(
      <TakeCompare
        takes={[local]}
        onManualReview={onManualReview}
        onKeep={onKeep}
        onReject={vi.fn()}
        onRevise={vi.fn()}
      />,
    );
    expect(screen.queryByText(/Score:/)).toBeNull();
    expect(screen.getAllByText('Only metadata was checked.')).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Keep' })[0]).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Comparison notes · A'), {
      target: { value: 'I watched the video.' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: 'Confirm manual review' })[0]);
    expect(onManualReview).toHaveBeenCalledWith(local, 'I watched the video.');
    const video = document.querySelector('video')!;
    Object.defineProperty(video, 'duration', { value: 8 });
    fireEvent.loadedMetadata(video);
    fireEvent.click(screen.getAllByRole('button', { name: '2s' })[0]);
    expect(video.currentTime).toBe(2);
  });
  it('numbers playable takes using their original shot list index when earlier takes are unplayable', () => {
    const failedTake = take('take-1-failed', 0);
    failedTake.status = 'failed';
    failedTake.localMediaUrl = undefined;
    const secondTake = take('take-2-ok', 85);
    render(
      <TakeCompare
        takes={[failedTake, secondTake]}
        onKeep={vi.fn()}
        onReject={vi.fn()}
        onRevise={vi.fn()}
      />,
    );
    expect(screen.getByText('Take 2')).toBeInTheDocument();
  });
});
