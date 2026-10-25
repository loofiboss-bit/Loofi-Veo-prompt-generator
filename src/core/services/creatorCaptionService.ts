import type { Caption } from '@core/types';
import { transcribeAudio } from '@core/services/gemini/geminiAudioService';

export function validateCreatorCaptions(value: unknown, duration: number): Caption[] {
  if (!Array.isArray(value) || value.length === 0) throw new Error('No valid captions returned.');
  return value.map((entry: unknown, index) => {
    if (!entry || typeof entry !== 'object') throw new Error('Invalid caption.');
    const item = entry as Partial<Caption>;
    if (
      typeof item.text !== 'string' ||
      !item.text.trim() ||
      typeof item.startTime !== 'number' ||
      typeof item.endTime !== 'number' ||
      !Number.isFinite(item.startTime) ||
      !Number.isFinite(item.endTime) ||
      item.startTime < 0 ||
      item.endTime <= item.startTime ||
      item.endTime > duration + 0.001
    )
      throw new Error(`Invalid caption timing or text at ${index + 1}.`);
    return {
      id: item.id ?? crypto.randomUUID(),
      text: item.text.trim(),
      startTime: item.startTime,
      endTime: item.endTime,
      style:
        item.style && ['classic', 'pop', 'karaoke'].includes(item.style) ? item.style : 'classic',
    };
  });
}
const timestamp = (value: number) => {
  const ms = Math.round(value * 1000);
  return `${String(Math.floor(ms / 3600000)).padStart(2, '0')}:${String(Math.floor(ms / 60000) % 60).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`;
};
export function exportCreatorSrt(captions: Caption[]): string {
  return [...captions]
    .sort((a, b) => a.startTime - b.startTime || a.endTime - b.endTime)
    .map(
      (caption, index) =>
        `${index + 1}\n${timestamp(caption.startTime)} --> ${timestamp(caption.endTime)}\n${caption.text}\n`,
    )
    .join('\n');
}
/** Overlaps are reported for review; no caption text is discarded. */
export function getCreatorCaptionOverlaps(
  captions: Caption[],
): Array<{ firstId: string; secondId: string }> {
  const sorted = [...captions].sort((a, b) => a.startTime - b.startTime);
  const overlaps: Array<{ firstId: string; secondId: string }> = [];
  sorted.forEach((caption, index) => {
    for (
      let next = index + 1;
      next < sorted.length && sorted[next].startTime < caption.endTime;
      next++
    ) {
      overlaps.push({ firstId: caption.id, secondId: sorted[next].id });
    }
  });
  return overlaps;
}

export function importCreatorSrt(text: string, duration: number): Caption[] {
  const time = (value: string) => {
    const match = /^(\d{2,}):([0-5]\d):([0-5]\d)[,.](\d{3})$/.exec(value);
    if (!match) throw new Error('Invalid SRT timestamp.');
    return (
      Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) + Number(match[4]) / 1000
    );
  };
  const entries = text
    .replace(/^\uFEFF/, '')
    .replace(/\r/g, '')
    .trim()
    .split(/\n\s*\n/)
    .map((block) => {
      const lines = block.split('\n');
      if (!/^\d+$/.test(lines.shift() ?? '')) throw new Error('Invalid SRT sequence.');
      const range = lines.shift()?.split(' --> ');
      if (!range || range.length !== 2) throw new Error('Invalid SRT time range.');
      return {
        id: crypto.randomUUID(),
        text: lines.join('\n'),
        startTime: time(range[0]),
        endTime: time(range[1]),
        style: 'classic',
      };
    });
  return validateCreatorCaptions(entries, duration);
}
export interface ProposeLocalCaptionsInput {
  mediaId?: string;
  blob?: Blob | null;
  clipOffset: number;
  clipDuration: number;
  transcriptScript?: string;
  silenceThresholdDb?: number;
  minSpeechDuration?: number;
  maxSegmentDuration?: number;
}

export function calculateSpeechIntervals(input: {
  silenceIntervals: Array<{ start: number; end: number }>;
  rangeStart: number;
  rangeEnd: number;
  minSpeechDuration?: number;
  maxSegmentDuration?: number;
}): Array<{ start: number; end: number }> {
  const minDur = input.minSpeechDuration ?? 0.3;
  const maxDur = input.maxSegmentDuration ?? 4.0;
  const rangeStart = Math.max(0, input.rangeStart);
  const rangeEnd = Math.max(rangeStart, input.rangeEnd);

  const silences = input.silenceIntervals
    .map((s) => ({
      start: Math.max(rangeStart, s.start),
      end: Math.min(rangeEnd, s.end),
    }))
    .filter((s) => s.end > s.start)
    .sort((a, b) => a.start - b.start);

  const speechSegments: Array<{ start: number; end: number }> = [];
  let currentPos = rangeStart;

  for (const silence of silences) {
    if (silence.start > currentPos) {
      const segDur = silence.start - currentPos;
      if (segDur >= minDur) {
        speechSegments.push({ start: currentPos, end: silence.start });
      }
    }
    currentPos = Math.max(currentPos, silence.end);
  }

  if (rangeEnd > currentPos) {
    const segDur = rangeEnd - currentPos;
    if (segDur >= minDur) {
      speechSegments.push({ start: currentPos, end: rangeEnd });
    }
  }

  if (speechSegments.length === 0 && rangeEnd - rangeStart >= minDur) {
    speechSegments.push({ start: rangeStart, end: rangeEnd });
  }

  const splitSegments: Array<{ start: number; end: number }> = [];
  for (const seg of speechSegments) {
    let s = seg.start;
    while (seg.end - s > maxDur) {
      splitSegments.push({ start: s, end: s + maxDur });
      s += maxDur;
    }
    if (seg.end - s >= minDur || splitSegments.length === 0) {
      splitSegments.push({ start: s, end: seg.end });
    } else {
      splitSegments[splitSegments.length - 1].end = seg.end;
    }
  }

  return splitSegments;
}

class CreatorCaptionService {
  private static instance: CreatorCaptionService;
  static getInstance() {
    return (this.instance ??= new CreatorCaptionService());
  }

  async propose(blob: Blob, duration: number): Promise<Caption[]> {
    return validateCreatorCaptions(await transcribeAudio(blob), duration);
  }

  async createTimeBlocks(input: ProposeLocalCaptionsInput): Promise<Caption[]> {
    const {
      mediaId,
      clipOffset = 0,
      clipDuration,
      transcriptScript,
      silenceThresholdDb = -32,
      minSpeechDuration = 0.3,
      maxSegmentDuration = 4.0,
    } = input;

    if (clipDuration <= 0) throw new Error('Clip duration must be positive.');

    let silenceIntervals: Array<{ start: number; end: number }> = [];

    if (mediaId && window.electron?.detectTimelineSilence) {
      try {
        const detected = await window.electron.detectTimelineSilence({
          mediaId,
          noiseThresholdDb: silenceThresholdDb,
          minDurationSeconds: 0.3,
        });
        if (Array.isArray(detected)) {
          silenceIntervals = detected;
        }
      } catch {
        /* Fall back to speech segment defaults */
      }
    }

    const rawSpeechSegments = calculateSpeechIntervals({
      silenceIntervals,
      rangeStart: clipOffset,
      rangeEnd: clipOffset + clipDuration,
      minSpeechDuration,
      maxSegmentDuration,
    });

    const scriptLines = transcriptScript
      ? transcriptScript
          .split(/\r?\n/)
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    const captions: Caption[] = rawSpeechSegments.map((seg, index) => {
      const relStart = Math.max(0, Number((seg.start - clipOffset).toFixed(3)));
      const relEnd = Math.min(clipDuration, Number((seg.end - clipOffset).toFixed(3)));
      const text = scriptLines[index] ?? '';

      return {
        id: crypto.randomUUID(),
        text,
        startTime: relStart,
        endTime: relEnd,
        style: 'classic',
      };
    });

    return captions;
  }
}
export const creatorCaptionService = CreatorCaptionService.getInstance();
