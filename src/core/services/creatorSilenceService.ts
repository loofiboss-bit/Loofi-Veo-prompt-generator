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

    const newTargetClips: TimelineClip[] = segments.map((seg, index) => {
      const transition = targetClip.transition
        ? index === 0 && targetClip.transition.duration <= seg.duration
          ? targetClip.transition
          : { type: 'cut' as const, duration: 0 }
        : undefined;
      return {
        ...targetClip,
        id:
          index === 0
            ? targetClip.id
            : `${targetClip.id}_cut_${index}_${crypto.randomUUID().slice(0, 8)}`,
        startTime: seg.startTime,
        offset: seg.offset,
        duration: seg.duration,
        ...(transition ? { transition } : {}),
      };
    });

    // Find all clips rippled on the target clip's track
    const rippledClipIds = new Set(
      clips
        .filter(
          (c) =>
            c.trackId === targetClip.trackId &&
            c.startTime >= targetClip.startTime + targetClip.duration - 0.001,
        )
        .map((c) => c.id),
    );

    const result: TimelineClip[] = [];

    for (const c of clips) {
      if (c.id === targetClipId) {
        result.push(...newTargetClips);
      } else if (c.sourceClipId === targetClipId && c.type === 'text') {
        // Map linked captions to surviving target segments
        const survivingCaptions: TimelineClip[] = [];
        for (let i = 0; i < newTargetClips.length; i++) {
          const seg = newTargetClips[i];
          const segOrigStart = Number(
            (targetClip.startTime + (seg.offset - targetClip.offset)).toFixed(3),
          );
          const segOrigEnd = Number((segOrigStart + seg.duration).toFixed(3));
          const cEnd = Number((c.startTime + c.duration).toFixed(3));

          const overlapStart = Math.max(c.startTime, segOrigStart);
          const overlapEnd = Math.min(cEnd, segOrigEnd);
          const overlapDuration = Number((overlapEnd - overlapStart).toFixed(3));

          if (overlapDuration >= 0.05) {
            const newStart = Number((seg.startTime + (overlapStart - segOrigStart)).toFixed(3));
            const newEnd = Number((newStart + overlapDuration).toFixed(3));
            survivingCaptions.push({
              ...c,
              id:
                survivingCaptions.length === 0
                  ? c.id
                  : `${c.id}_split_${i}_${crypto.randomUUID().slice(0, 8)}`,
              sourceClipId: seg.id,
              startTime: newStart,
              duration: overlapDuration,
              offset: 0,
              caption: c.caption
                ? {
                    ...c.caption,
                    id: survivingCaptions.length === 0 ? c.caption.id : crypto.randomUUID(),
                    startTime: newStart,
                    endTime: newEnd,
                  }
                : undefined,
            });
          }
        }
        result.push(...survivingCaptions);
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
        c.startTime >= targetClip.startTime + targetClip.duration - 0.001 &&
        Boolean(c.sourceClipId && rippledClipIds.has(c.sourceClipId))
      ) {
        // Only captions linked to clips on the rippled track move; free text is independent.
        const newStart = Math.max(0, Number((c.startTime - totalDurationRemoved).toFixed(3)));
        const newEnd = Number((newStart + c.duration).toFixed(3));
        result.push({
          ...c,
          startTime: newStart,
          caption: c.caption
            ? {
                ...c.caption,
                startTime: newStart,
                endTime: newEnd,
              }
            : undefined,
        });
      } else {
        result.push(c);
      }
    }

    return result;
  }
}

export const creatorSilenceService = CreatorSilenceService.getInstance();
