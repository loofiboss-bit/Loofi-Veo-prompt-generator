import { Shot } from '@core/types';

/**
 * Converts a frame count to SMPTE Timecode (HH:MM:SS:FF).
 * Assumes Non-Drop Frame for simplicity as Veo generates progressive web video.
 */
export const framesToTimecode = (frames: number, fps: number): string => {
  const totalSeconds = Math.floor(frames / fps);
  const ff = Math.floor(frames % fps);
  const ss = Math.floor(totalSeconds % 60);
  const mm = Math.floor((totalSeconds / 60) % 60);
  const hh = Math.floor(totalSeconds / 3600);

  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}:${pad(ff)}`;
};

/**
 * Generates a CMX3600 formatted EDL string from a list of Shots.
 *
 * @param shots The list of shots to include.
 * @param title The title of the sequence.
 * @param fps The frame rate (default 24).
 * @returns A string containing the full EDL content.
 */
export const generateEDL = (
  shots: Shot[],
  title: string = 'VEO_SEQUENCE',
  fps: number = 24,
): string => {
  let edl = `TITLE: ${title.toUpperCase().replace(/[^A-Z0-9_]/g, '_')}\nFCM: NON-DROP FRAME\n\n`;

  let recordFrameCount = 0; // Starts at 00:00:00:00

  shots.forEach((shot, index) => {
    if (!shot.generatedVideoUrl) return;

    // Determine Duration
    // Note: Without analyzing the video blob header, we have to estimate or use metadata.
    // Veo Preview videos are typically around 5-6 seconds.
    // For a robust EDL, we usually need exact frames.
    // Here we default to 5 seconds (120 frames @ 24fps) if not known,
    // OR we can assume the user will relink and the handles handle slight mismatches.
    // Ideally, we'd read the blob duration, but that requires async loading.
    // For this sync utility, we'll assume standard 5s duration per clip unless tracked otherwise.
    const durationSeconds = 5;
    const durationFrames = durationSeconds * fps;

    const eventNum = (index + 1).toString().padStart(3, '0');
    // Reel ID matches the renamed file (e.g. 001.mp4 -> 001)
    const reelId = (index + 1).toString().padStart(3, '0');

    const srcIn = framesToTimecode(0, fps);
    const srcOut = framesToTimecode(durationFrames, fps);

    const recIn = framesToTimecode(recordFrameCount, fps);
    const recOut = framesToTimecode(recordFrameCount + durationFrames, fps);

    // CMX3600 Format:
    // ID  REEL  TRACK  TYPE  SRC_IN      SRC_OUT     REC_IN      REC_OUT
    // 001 001   V      C     00:00:00:00 00:00:05:00 00:00:00:00 00:00:05:00
    edl += `${eventNum}  ${reelId}      V     C        ${srcIn} ${srcOut} ${recIn} ${recOut}\n`;

    // Add Comment with clip name/prompt snippet for easier identification
    // CMX comments start with *
    const clipName = `SHOT_${reelId}`;
    edl += `* FROM CLIP NAME: ${clipName}.mp4\n`;
    if (shot.action) {
      const safeComment = shot.action.replace(/\n/g, ' ').substring(0, 60);
      edl += `* COMMENT: ${safeComment}...\n`;
    }
    edl += `\n`;

    recordFrameCount += durationFrames;
  });

  return edl;
};
