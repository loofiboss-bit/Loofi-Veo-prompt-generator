
import { TimelineClip } from '../types';
import { TimeRange } from '../services/audioAnalysisService';

/**
 * Applies "Smart Cut" logic to a single timeline clip based on detected silence.
 * Splits the clip into multiple clips representing the "active" audio segments,
 * and ripples them to close gaps.
 * 
 * @param clip The source TimelineClip.
 * @param silenceRanges Array of {start, end} relative to the source asset's time 0.
 * @returns An array of new TimelineClips.
 */
export const applySmartCut = (clip: TimelineClip, silenceRanges: TimeRange[]): TimelineClip[] => {
    const sourceDuration = clip.duration; // Actually, clip.duration is trimmed duration. 
    // We need the clip's offset to know where we are in the source file.
    // The silenceRanges are absolute to the Source File.
    
    const clipIn = clip.offset;
    const clipOut = clip.offset + clip.duration;

    // 1. Calculate Active Ranges (Inverse of Silence)
    // We only care about active ranges that fall WITHIN the current clip's trim [offset, offset+duration]
    const activeRanges: TimeRange[] = [];
    let cursor = 0;

    // Sort silence just in case
    const sortedSilence = [...silenceRanges].sort((a, b) => a.start - b.start);

    for (const silence of sortedSilence) {
        // There was active audio between cursor and start of silence
        if (silence.start > cursor) {
            activeRanges.push({ start: cursor, end: silence.start });
        }
        cursor = silence.end;
    }
    // Add final active segment after last silence
    // Note: We don't know exact source length here easily, assuming Infinity or check max range
    // For safety, we assume active until the clipOut point at least
    activeRanges.push({ start: cursor, end: Infinity });

    // 2. Filter Active Ranges to those visible in the Clip
    const visibleSegments: TimeRange[] = [];
    
    for (const range of activeRanges) {
        // Calculate intersection with [clipIn, clipOut]
        const segStart = Math.max(range.start, clipIn);
        const segEnd = Math.min(range.end, clipOut);

        if (segEnd > segStart) {
            visibleSegments.push({ start: segStart, end: segEnd });
        }
    }

    // 3. Create New Clips (Ripple)
    const newClips: TimelineClip[] = [];
    let currentTimelinePos = clip.startTime; // Start placing where the old clip started

    visibleSegments.forEach((seg, index) => {
        const segDuration = seg.end - seg.start;
        
        // Don't create microscopic clips (< 0.1s) as they look glitchy
        if (segDuration < 0.1) return;

        const newClip: TimelineClip = {
            ...clip,
            id: `${clip.id}_cut_${index}`,
            startTime: currentTimelinePos,
            offset: seg.start,
            duration: segDuration,
            label: `${clip.label} (${index + 1})`
        };

        newClips.push(newClip);
        currentTimelinePos += segDuration; // Ripple: Move cursor forward by duration
    });

    return newClips;
};
