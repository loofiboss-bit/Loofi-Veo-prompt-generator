import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@/test-utils';
import { VideoResultCompare, type VideoComparisonResult } from './VideoResultCompare';

const result = (id: string): VideoComparisonResult => ({
  id,
  label: `Clip ${id}`,
  src: `blob:${id}`,
  prompt: `Frozen prompt ${id}`,
  negativePrompt: `Negative ${id}`,
  settings: `Model ${id}`,
  comparisonNotes: '',
});
const results = [result('a'), result('b')];

function metadata(lengths = [8, 5]) {
  const videos = Array.from(document.querySelectorAll('video'));
  videos.forEach((video, index) => {
    Object.defineProperty(video, 'duration', { configurable: true, value: lengths[index] });
    fireEvent.loadedMetadata(video);
  });
  return videos;
}

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
});

describe('VideoResultCompare', () => {
  it('waits for metadata, synchronizes controls and stops at the shorter clip', async () => {
    render(<VideoResultCompare contextId="project" results={results} />);
    expect(screen.getByRole('button', { name: 'Play' })).toBeDisabled();
    const [a, b] = metadata();
    a.currentTime = 2;
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    await screen.findByRole('button', { name: 'Pause' });
    expect(a.play).toHaveBeenCalledTimes(2);
    expect(a.currentTime).toBe(2);
    expect(b.currentTime).toBe(2);
    const position = screen.getByRole('slider', { name: 'Comparison position' });
    expect(position).toHaveAttribute('max', '5');
    fireEvent.change(position, { target: { value: '4' } });
    expect(a.currentTime).toBe(4);
    expect(b.currentTime).toBe(4);
    a.currentTime = 6;
    fireEvent.timeUpdate(a);
    expect(a.currentTime).toBe(5);
    expect(b.currentTime).toBe(5);
    expect(a.pause).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('button', { name: 'Play' })).toBeEnabled();
  });

  it('allows exactly one audio source and corrects playback drift', async () => {
    render(<VideoResultCompare contextId="project" results={results} />);
    const [a, b] = metadata();
    expect(a.muted).toBe(false);
    expect(b.muted).toBe(true);
    fireEvent.change(screen.getByRole('combobox', { name: 'Listen to' }), {
      target: { value: 'B' },
    });
    expect(a.muted).toBe(true);
    expect(b.muted).toBe(false);
    a.currentTime = 3;
    b.currentTime = 0;
    fireEvent.timeUpdate(a);
    expect(b.currentTime).toBe(3);
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    await screen.findByRole('button', { name: 'Pause' });
    fireEvent.waiting(b);
    expect(screen.getByRole('alert')).toHaveTextContent('buffers');
    expect(screen.getByRole('button', { name: 'Play' })).toBeEnabled();
  });

  it('pauses both clips and reports playback rejection and missing media', async () => {
    render(<VideoResultCompare contextId="project" results={results} />);
    const [a, b] = metadata();
    vi.spyOn(b, 'play').mockRejectedValue(new Error('Cannot decode'));
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Playback failed');
    expect(a.pause).toHaveBeenCalled();
    fireEvent.error(a);
    expect(screen.getByRole('alert')).toHaveTextContent('local videos are available');
  });

  it('uses one pane for one playable result and pauses removed sources on context change and unmount', async () => {
    const view = render(<VideoResultCompare contextId="project-a" results={results} />);
    const videos = metadata();
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    await screen.findByRole('button', { name: 'Pause' });
    const pauses = vi.mocked(HTMLMediaElement.prototype.pause).mock.calls.length;
    view.rerender(<VideoResultCompare contextId="project-b" results={[result('c')]} />);
    expect(document.querySelectorAll('video')).toHaveLength(1);
    expect(screen.queryByRole('combobox', { name: 'Listen to' })).toBeNull();
    expect(vi.mocked(HTMLMediaElement.prototype.pause).mock.calls.length).toBeGreaterThan(pauses);
    expect(videos[0].isConnected).toBe(false);
    const single = metadata([4])[0];
    expect(single.controls).toBe(true);
    view.unmount();
    expect(single.pause).toHaveBeenCalled();
  });

  it('shows the frozen source differences without changing their content', () => {
    render(<VideoResultCompare contextId="project" results={results} />);
    const summary = screen.getByText('Compare frozen prompts and settings');
    const details = summary.closest('details')!;
    details.open = true;
    fireEvent(details, new Event('toggle'));
    expect(screen.getByText(/Frozen prompt a/)).toHaveTextContent('Frozen prompt b');
    expect(screen.getByText(/Negative a/)).toHaveTextContent('Negative b');
    expect(screen.getByText(/Model a/)).toHaveTextContent('Model b');
    expect(results[0].prompt).toBe('Frozen prompt a');
  });

  it('saves notes explicitly per result and retains edits made during a save', async () => {
    let finish: () => void = () => {};
    const save = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            finish = resolve;
          }),
      )
      .mockResolvedValue(undefined);
    render(<VideoResultCompare contextId="project" results={results} onSaveNotes={save} />);
    const a = screen.getByRole('textbox', { name: 'Comparison notes · A' });
    const b = screen.getByRole('textbox', { name: 'Comparison notes · B' });
    fireEvent.change(a, { target: { value: 'A detail' } });
    fireEvent.change(b, { target: { value: 'B detail' } });
    expect(save).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByRole('button', { name: 'Save notes' })[0]);
    expect(save).toHaveBeenCalledWith('a', 'A detail');
    expect(screen.getByText('Saving…')).toBeInTheDocument();
    fireEvent.change(a, { target: { value: 'A newer edit' } });
    await act(async () => finish());
    expect(a).toHaveValue('A newer edit');
    expect(screen.getAllByText('Not saved')).toHaveLength(2);
    fireEvent.click(screen.getAllByRole('button', { name: 'Save notes' })[1]);
    await waitFor(() => expect(save).toHaveBeenCalledWith('b', 'B detail'));
    expect(b).toHaveValue('B detail');
  });

  it('reports note save failures without claiming a durable save', async () => {
    const save = vi.fn().mockRejectedValue(new Error('Storage full'));
    render(<VideoResultCompare contextId="project" results={[result('a')]} onSaveNotes={save} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Comparison notes · A' }), {
      target: { value: 'Keep these notes' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save notes' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Notes were not saved. Storage full',
    );
    expect(screen.queryByText('Saved')).toBeNull();
    expect(screen.getByRole('textbox')).toHaveValue('Keep these notes');
  });

  it('keeps separate drafts when selecting results and clears them for a different project', () => {
    const view = render(<VideoResultCompare contextId="one" results={[...results, result('c')]} />);
    const notes = () => screen.getByRole('textbox', { name: 'Comparison notes · A' });
    fireEvent.change(notes(), { target: { value: 'Notes on b' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Result A' }), {
      target: { value: 'a' },
    });
    expect(notes()).toHaveValue('');
    fireEvent.change(notes(), { target: { value: 'Notes on a' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Result A' }), {
      target: { value: 'b' },
    });
    expect(notes()).toHaveValue('Notes on b');
    view.rerender(<VideoResultCompare contextId="two" results={results} />);
    expect(notes()).toHaveValue('');
  });

  it('swaps A and B clips and supports Spacebar and Arrow key navigation', async () => {
    render(<VideoResultCompare contextId="one" results={results} />);
    const [videoA, videoB] = document.querySelectorAll('video');
    Object.defineProperty(videoA, 'duration', { value: 6 });
    Object.defineProperty(videoB, 'duration', { value: 6 });
    fireEvent.loadedMetadata(videoA);
    fireEvent.loadedMetadata(videoB);

    expect(screen.getByRole('combobox', { name: 'Result A' })).toHaveValue('a');
    expect(screen.getByRole('combobox', { name: 'Result B' })).toHaveValue('b');

    const swapButton = screen.getByRole('button', { name: 'Swap A/B' });
    fireEvent.click(swapButton);

    expect(screen.getByRole('combobox', { name: 'Result A' })).toHaveValue('b');
    expect(screen.getByRole('combobox', { name: 'Result B' })).toHaveValue('a');

    const region = screen.getByRole('region', { name: 'Video comparison' });
    region.focus();
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    const seekSlider = screen.getByRole('slider', { name: 'Comparison position' });
    expect(Number(seekSlider.getAttribute('value'))).toBeGreaterThan(0);
  });

  it('preserves playback position across Swap A/B and supports frame-step buttons, loop, and timestamp chips', async () => {
    render(<VideoResultCompare contextId="pro" results={results} />);
    metadata([6, 6]);
    const seekSlider = screen.getByRole('slider', { name: 'Comparison position' });
    fireEvent.change(seekSlider, { target: { value: '2.5' } });
    expect(screen.getByTestId('comparison-timecode')).toHaveTextContent('00:02.50 / 00:06.00');

    // Swap A/B preserves position on remounted video elements
    fireEvent.click(screen.getByRole('button', { name: 'Swap A/B' }));
    const [swappedA, swappedB] = metadata([6, 6]);
    expect(swappedA.currentTime).toBe(2.5);
    expect(swappedB.currentTime).toBe(2.5);

    // Frame step buttons (-1f / +1f)
    fireEvent.click(screen.getByRole('button', { name: 'Next frame' }));
    expect(swappedA.currentTime).toBeCloseTo(2.5 + 1 / 30, 3);
    fireEvent.click(screen.getByRole('button', { name: 'Previous frame' }));
    expect(swappedA.currentTime).toBeCloseTo(2.5, 3);

    // Insert timestamp into notes and click chip to seek
    fireEvent.click(screen.getAllByRole('button', { name: '+ @2.5s' })[0]);
    const notesA = screen.getByRole('textbox', { name: 'Comparison notes · A' });
    expect(notesA).toHaveValue('@2.5s ');
    fireEvent.change(seekSlider, { target: { value: '1' } });
    expect(swappedA.currentTime).toBe(1);
    fireEvent.click(screen.getByRole('button', { name: '@2.5s' }));
    expect(swappedA.currentTime).toBe(2.5);

    // Loop mode restarts at 0 when reaching limit
    fireEvent.click(screen.getByRole('checkbox', { name: 'Loop' }));
    swappedA.currentTime = 6;
    fireEvent.timeUpdate(swappedA);
    expect(swappedA.currentTime).toBe(0);
  });
});
