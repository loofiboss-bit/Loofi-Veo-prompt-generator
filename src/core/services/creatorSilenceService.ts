import type { TimelineClip } from '@core/types';

export interface SilenceInterval {
  start: number;
  end: number;
  duration: number;
}

export interface SilenceCutProposal {
  silence: SilenceInterval;
  clipTimelineStart: number;
  clipTimelineEnd: number;
  selected: boolean;
}

export class CreatorSilenceService {
  private static instance: CreatorSilenceService;
  static getInstance(): CreatorSilenceService {
    if (!CreatorSilenceService.instance) {
      CreatorSilenceService.instance = new CreatorSilenceService();
    }
    return CreatorSilenceService.instance;
  }

  async detectSilence(
    mediaKey: string,
    options?: { noiseThresholdDb?: number; minDurationSeconds?: number },
  ): Promise<SilenceInterval[]> {
    if (typeof window !== 'undefined' && window.electron?.detectTimelineSilence) {
      return await window.electron.detectTimelineSilence({
        mediaId: mediaKey,
        noiseThresholdDb: options?.noiseThresholdDb ?? -35,
        minDurationSeconds: options?.minDurationSeconds ?? 0.5,
      });
    }
    return [];
  }

  buildProposals(clip: TimelineClip, silences: SilenceInterval[]): SilenceCutProposal[] {
    const clipStart = clip.startTime;
    const clipOffset = clip.offset;
    const clipDuration = clip.duration;
    const clipEndOffset = clipOffset + clipDuration;

    return silences
      .filter((s) => s.end > clipOffset && s.start < clipEndOffset)
      .map((s) => {
        const clampedStart = Math.max(clipOffset, s.start);
        const clampedEnd = Math.min(clipEndOffset, s.end);
        return {
          silence: s,
          clipTimelineStart: Number((clipStart + (clampedStart - clipOffset)).toFixed(3)),
          clipTimelineEnd: Number((clipStart + (clampedEnd - clipOffset)).toFixed(3)),
          selected: true,
        };
      })
      .filter((p) => p.clipTimelineEnd - p.clipTimelineStart >= 0.1);
  }

  applyCuts(
    clips: TimelineClip[],
    targetClipId: string,
    acceptedProposals: SilenceCutProposal[],
  ): TimelineClip[] {
    const targetClip = clips.find((c) => c.id === targetClipId);
    if (!targetClip || acceptedProposals.length === 0) return clips;

    const sorted = [...acceptedProposals]
      .filter((p) => p.selected)
      .sort((a, b) => a.clipTimelineStart - b.clipTimelineStart);

    if (sorted.length === 0) return clips;

    interface Segment {
      startTime: number;
      offset: number;
      duration: number;
    }
    const segments: Segment[] = [];
    let currentSourceOffset = targetClip.offset;
    let currentTimelineTime = targetClip.startTime;

    for (const proposal of sorted) {
      const silenceSourceStart =
        targetClip.offset + (proposal.clipTimelineStart - targetClip.startTime);
      const silenceSourceEnd =
        targetClip.offset + (proposal.clipTimelineEnd - targetClip.startTime);

      const segmentDuration = Number((silenceSourceStart - currentSourceOffset).toFixed(3));
      if (segmentDuration >= 0.05) {
        segments.push({
          startTime: Number(currentTimelineTime.toFixed(3)),
          offset: Number(currentSourceOffset.toFixed(3)),
          duration: segmentDuration,
        });
        currentTimelineTime += segmentDuration;
      }
      currentSourceOffset = silenceSourceEnd;
    }

    const finalSourceEnd = targetClip.offset + targetClip.duration;
    const remainingDuration = Number((finalSourceEnd - currentSourceOffset).toFixed(3));
    if (remainingDuration >= 0.05) {
      segments.push({
        startTime: Number(currentTimelineTime.toFixed(3)),
        offset: Number(currentSourceOffset.toFixed(3)),
        duration: remainingDuration,
      });
      currentTimelineTime += remainingDuration;
    }

    if (segments.length === 0) return clips;

    const totalDurationRemoved = Number(
      (targetClip.startTime + targetClip.duration - currentTimelineTime).toFixed(3),
    );

    const newTargetClips: TimelineClip[] = segments.map((seg, index) => ({
      ...targetClip,
      id:
        index === 0
          ? targetClip.id
          : `${targetClip.id}_cut_${index}_${crypto.randomUUID().slice(0, 8)}`,
      startTime: seg.startTime,
      offset: seg.offset,
      duration: seg.duration,
    }));

    const result: TimelineClip[] = [];

    for (const c of clips) {
      if (c.id === targetClipId) {
        result.push(...newTargetClips);
      } else if (
        c.trackId === targetClip.trackId &&
        c.startTime >= targetClip.startTime + targetClip.duration - 0.001
      ) {
        result.push({
          ...c,
          startTime: Math.max(0, Number((c.startTime - totalDurationRemoved).toFixed(3))),
        });
      } else if (
        c.type === 'text' &&
        c.startTime >= targetClip.startTime + targetClip.duration - 0.001
      ) {
        result.push({
          ...c,
          startTime: Math.max(0, Number((c.startTime - totalDurationRemoved).toFixed(3))),
        });
      } else {
        result.push(c);
      }
    }

    return result;
  }
}

export const creatorSilenceService = CreatorSilenceService.getInstance();
