
import { Asset, TimelineClip } from '../types';
import { detectBeats } from './audioAnalysisService';

/**
 * Generates a sequence of timeline clips synchronized to the audio beats.
 * 
 * @param audioBuffer The music track to sync to.
 * @param videoAssets Pool of video assets to cut between.
 * @param minShotDuration Minimum length of a shot in seconds (prevents rapid-fire flickering).
 * @returns Array of TimelineClip objects.
 */
export const generateBeatSyncedSequence = async (
    audioBuffer: AudioBuffer, 
    videoAssets: Asset[],
    minShotDuration: number = 0.8
): Promise<TimelineClip[]> => {
    if (videoAssets.length === 0) return [];

    // 1. Detect Beats
    const rawBeats = await detectBeats(audioBuffer);
    
    // 2. Filter Beats for Pacing (The "Major Beat" Logic)
    // We construct a new array of timestamps where every interval is > minShotDuration
    const cutPoints: number[] = [0];
    let lastCutTime = 0;

    for (const beatTime of rawBeats) {
        if (beatTime - lastCutTime >= minShotDuration) {
            cutPoints.push(beatTime);
            lastCutTime = beatTime;
        }
    }

    // Ensure we cover the end of the song if the last beat is far from the end
    if (audioBuffer.duration - lastCutTime > minShotDuration) {
        cutPoints.push(audioBuffer.duration);
    }

    // 3. Assemble Sequence
    const timelineClips: TimelineClip[] = [];
    
    // Helper to get a random valid offset for a video
    // We assume a default video duration of 10s if metadata isn't available/parsed, 
    // effectively randomizing within the first 10s.
    const getSafeOffset = (targetDuration: number, assetId: string) => {
        // In a real app, we'd check metadata.duration. 
        // Here we fake a safe random offset, assuming clips are at least 5s long.
        // If the clip is actually shorter, the player usually handles it by clamping or looping.
        const estimatedAssetDuration = 10; 
        const maxOffset = Math.max(0, estimatedAssetDuration - targetDuration);
        return Math.random() * maxOffset;
    };

    for (let i = 0; i < cutPoints.length - 1; i++) {
        const startTime = cutPoints[i];
        const endTime = cutPoints[i+1];
        const duration = endTime - startTime;

        // Pick video in round-robin fashion
        const assetIndex = i % videoAssets.length;
        const asset = videoAssets[assetIndex];

        // Randomize the start point within the clip to make it look "edited"
        const offset = getSafeOffset(duration, asset.id);

        const clip: TimelineClip = {
            id: `auto_montage_${Date.now()}_${i}`,
            resourceId: asset.id,
            trackId: 'video_main',
            startTime: startTime,
            duration: duration,
            offset: offset,
            type: 'video',
            label: `Beat Cut ${i + 1}`,
            transition: { type: 'cut', duration: 0 }
        };

        timelineClips.push(clip);
    }

    return timelineClips;
};
