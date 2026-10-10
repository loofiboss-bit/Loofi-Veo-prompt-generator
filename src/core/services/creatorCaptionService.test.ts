import { describe, expect, it, vi } from 'vitest';
vi.mock('@core/services/gemini/geminiAudioService', () => ({ transcribeAudio: vi.fn() }));
import { transcribeAudio } from '@core/services/gemini/geminiAudioService';
import {
  creatorCaptionService,
  getCreatorCaptionOverlaps,
  exportCreatorSrt,
  importCreatorSrt,
  validateCreatorCaptions,
} from './creatorCaptionService';

describe('creator captions', () => {
  it('round trips Unicode and multiline text through SRT', () => {
    const input = [
      {
        id: 'c',
        text: 'Hej världen!\n第二行',
        startTime: 1.234,
        endTime: 4.567,
        style: 'classic' as const,
      },
    ];
    expect(importCreatorSrt(exportCreatorSrt(input), 5)[0]).toMatchObject({
      text: input[0].text,
      startTime: 1.234,
      endTime: 4.567,
    });
  });
  it.each([
    '1\n00:99:00,000 --> 00:00:03,000\nText',
    '1\n00:00:03,000 --> 00:00:01,000\nText',
    '1\n00:00:00,000 --> 00:00:07,000\nText',
    '',
  ])('rejects malformed or out of range subtitles', (text) => {
    expect(() => importCreatorSrt(text, 5)).toThrow();
  });
  it.each([
    [],
    null,
    [{ text: '', startTime: 0, endTime: 1 }],
    [{ text: 'Hello', startTime: NaN, endTime: 1 }],
  ])('never treats empty or malformed proposals as successful', (value) => {
    expect(() => validateCreatorCaptions(value, 3)).toThrow();
  });
  it('propagates provider failure and validates an empty provider response', async () => {
    vi.mocked(transcribeAudio).mockRejectedValueOnce(new Error('provider failed'));
    await expect(creatorCaptionService.propose(new Blob(), 3)).rejects.toThrow('provider failed');
    vi.mocked(transcribeAudio).mockResolvedValueOnce([]);
    await expect(creatorCaptionService.propose(new Blob(), 3)).rejects.toThrow('No valid captions');
  });
});

describe('caption review and export order', () => {
  const caption = (id: string, startTime: number, endTime: number) => ({
    id,
    text: id,
    startTime,
    endTime,
    style: 'classic' as const,
  });
  it('exports chronological sequence without mutating captions or dropping overlaps', () => {
    const captions = [caption('later', 4, 6), caption('first', 0, 5), caption('same', 4, 7)];
    const srt = exportCreatorSrt(captions);
    expect(importCreatorSrt(srt, 7).map((entry) => entry.text)).toEqual(['first', 'later', 'same']);
    expect(captions[0].id).toBe('later');
    expect(getCreatorCaptionOverlaps(captions)).toEqual([
      { firstId: 'first', secondId: 'later' },
      { firstId: 'first', secondId: 'same' },
      { firstId: 'later', secondId: 'same' },
    ]);
  });
  it('does not report touching captions as overlapping', () => {
    expect(getCreatorCaptionOverlaps([caption('a', 0, 2), caption('b', 2, 3)])).toEqual([]);
  });
});
