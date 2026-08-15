/**
 * Previz Animatic Service (v12.0.0)
 *
 * Provides real-time 2D/canvas motion simulation for storyboard animatics,
 * beat-grid snapping, and local scratch dialogue synthesis.
 */

import type {
  AnimaticMotionType,
  AnimaticKeyframe,
  AnimaticShotConfig,
  TimelineBeatGrid,
} from '@core/types/animatic';
import type { Shot } from '@core/types';

export const DEFAULT_ANIMATIC_CONFIG: AnimaticShotConfig = {
  shotId: 1,
  motionType: 'ken-burns-zoom-in',
  scratchDialogueRate: 1.0,
  scratchDialoguePitch: 1.0,
  foleyGain: 0.8,
};

/**
 * Calculates standard transform keyframes for a given motion type.
 */
export function getMotionKeyframes(motionType: AnimaticMotionType): AnimaticKeyframe[] {
  switch (motionType) {
    case 'ken-burns-zoom-in':
      return [
        { timePercent: 0, scale: 1.0, translateX: 0, translateY: 0, rotateDegrees: 0, opacity: 1 },
        {
          timePercent: 100,
          scale: 1.18,
          translateX: -2,
          translateY: -2,
          rotateDegrees: 0,
          opacity: 1,
        },
      ];
    case 'ken-burns-zoom-out':
      return [
        { timePercent: 0, scale: 1.22, translateX: 3, translateY: 2, rotateDegrees: 0, opacity: 1 },
        {
          timePercent: 100,
          scale: 1.0,
          translateX: 0,
          translateY: 0,
          rotateDegrees: 0,
          opacity: 1,
        },
      ];
    case 'pan-left-to-right':
      return [
        {
          timePercent: 0,
          scale: 1.15,
          translateX: -6,
          translateY: 0,
          rotateDegrees: 0,
          opacity: 1,
        },
        {
          timePercent: 100,
          scale: 1.15,
          translateX: 6,
          translateY: 0,
          rotateDegrees: 0,
          opacity: 1,
        },
      ];
    case 'pan-right-to-left':
      return [
        { timePercent: 0, scale: 1.15, translateX: 6, translateY: 0, rotateDegrees: 0, opacity: 1 },
        {
          timePercent: 100,
          scale: 1.15,
          translateX: -6,
          translateY: 0,
          rotateDegrees: 0,
          opacity: 1,
        },
      ];
    case 'tilt-up':
      return [
        { timePercent: 0, scale: 1.15, translateX: 0, translateY: 5, rotateDegrees: 0, opacity: 1 },
        {
          timePercent: 100,
          scale: 1.15,
          translateX: 0,
          translateY: -5,
          rotateDegrees: 0,
          opacity: 1,
        },
      ];
    case 'tilt-down':
      return [
        {
          timePercent: 0,
          scale: 1.15,
          translateX: 0,
          translateY: -5,
          rotateDegrees: 0,
          opacity: 1,
        },
        {
          timePercent: 100,
          scale: 1.15,
          translateX: 0,
          translateY: 5,
          rotateDegrees: 0,
          opacity: 1,
        },
      ];
    case 'dutch-tilt-dynamic':
      return [
        {
          timePercent: 0,
          scale: 1.12,
          translateX: 0,
          translateY: 0,
          rotateDegrees: -4,
          opacity: 1,
        },
        {
          timePercent: 100,
          scale: 1.2,
          translateX: -3,
          translateY: -2,
          rotateDegrees: 4,
          opacity: 1,
        },
      ];
    case 'whip-dissolve':
      return [
        { timePercent: 0, scale: 1.0, translateX: 0, translateY: 0, rotateDegrees: 0, opacity: 1 },
        {
          timePercent: 85,
          scale: 1.05,
          translateX: -1,
          translateY: 0,
          rotateDegrees: 0,
          opacity: 1,
        },
        {
          timePercent: 100,
          scale: 1.25,
          translateX: -15,
          translateY: 0,
          rotateDegrees: -3,
          opacity: 0.2,
        },
      ];
    case 'static':
    default:
      return [
        { timePercent: 0, scale: 1.0, translateX: 0, translateY: 0, rotateDegrees: 0, opacity: 1 },
        {
          timePercent: 100,
          scale: 1.0,
          translateX: 0,
          translateY: 0,
          rotateDegrees: 0,
          opacity: 1,
        },
      ];
  }
}

/**
 * Interpolates CSS transform values at a given progress (0 to 1).
 */
export function interpolateAnimaticTransform(
  motionType: AnimaticMotionType,
  progress: number, // 0.0 to 1.0
  customKeyframes?: AnimaticKeyframe[],
): {
  transform: string;
  opacity: number;
  scale: number;
  translateX: number;
  translateY: number;
  rotation: number;
} {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const percent = clampedProgress * 100;
  const keyframes =
    customKeyframes && customKeyframes.length >= 2
      ? customKeyframes
      : getMotionKeyframes(motionType);

  let prev = keyframes[0];
  let next = keyframes[keyframes.length - 1];

  for (let i = 0; i < keyframes.length - 1; i++) {
    if (percent >= keyframes[i].timePercent && percent <= keyframes[i + 1].timePercent) {
      prev = keyframes[i];
      next = keyframes[i + 1];
      break;
    }
  }

  const range = next.timePercent - prev.timePercent;
  const segmentRatio = range > 0 ? (percent - prev.timePercent) / range : 0;

  const scale = prev.scale + (next.scale - prev.scale) * segmentRatio;
  const translateX = prev.translateX + (next.translateX - prev.translateX) * segmentRatio;
  const translateY = prev.translateY + (next.translateY - prev.translateY) * segmentRatio;
  const rotation = prev.rotateDegrees + (next.rotateDegrees - prev.rotateDegrees) * segmentRatio;
  const opacity = prev.opacity + (next.opacity - prev.opacity) * segmentRatio;

  return {
    transform: `scale(${scale.toFixed(3)}) translate(${translateX.toFixed(2)}%, ${translateY.toFixed(2)}%) rotate(${rotation.toFixed(2)}deg)`,
    opacity,
    scale,
    translateX,
    translateY,
    rotation,
  };
}

/**
 * Maps arbitrary camera description text to standard AnimaticMotionType.
 */
export function mapCameraToMotionType(cameraText: string): AnimaticMotionType {
  const lower = (cameraText || '').toLowerCase();
  if (lower.includes('zoom out') || lower.includes('pull out')) return 'ken-burns-zoom-out';
  if (lower.includes('zoom') || lower.includes('push') || lower.includes('dolly in'))
    return 'ken-burns-zoom-in';
  if (lower.includes('pan right') || lower.includes('tracking right')) return 'pan-left-to-right';
  if (lower.includes('pan left') || lower.includes('tracking left')) return 'pan-right-to-left';
  if (lower.includes('tilt up') || lower.includes('crane up')) return 'tilt-up';
  if (lower.includes('tilt down') || lower.includes('crane down')) return 'tilt-down';
  if (lower.includes('dutch') || lower.includes('roll')) return 'dutch-tilt-dynamic';
  if (lower.includes('whip') || lower.includes('fast')) return 'whip-dissolve';
  return 'ken-burns-zoom-in';
}

/**
 * Calculates transform metrics for a shot camera at a given progress (0 to 1).
 */
export function calculateShotMotion(
  cameraText: string,
  progress: number,
): {
  transform: string;
  opacity: number;
  scale: number;
  translateX: number;
  translateY: number;
  rotation: number;
} {
  const motionType = mapCameraToMotionType(cameraText);
  return interpolateAnimaticTransform(motionType, progress);
}

/**
 * Formats seconds into HH:MM:SS string.
 */
export function formatTimecode(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds || 0);
  const mins = Math.floor(s / 60);
  const secs = Math.floor(s % 60);
  const millis = Math.floor((s % 1) * 100);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(millis).padStart(2, '0')}`;
}

/**
 * Snaps shot durations to the closest musical beat or downbeat on the beat grid.
 */
export function snapShotDurationsToBeatGrid(
  shots: Shot[],
  beatGrid: TimelineBeatGrid,
  targetBeatInterval: 2 | 4 | 8 = 4,
): Shot[] {
  if (!shots || shots.length === 0 || !beatGrid || beatGrid.bpm <= 0) return shots;

  const secondsPerBeat = 60 / beatGrid.bpm;
  const snapUnitSeconds = secondsPerBeat * targetBeatInterval;

  return shots.map((shot) => {
    const rawDuration = shot.duration || 4;
    const snapped = Math.max(2, Math.round(rawDuration / snapUnitSeconds) * snapUnitSeconds);
    return {
      ...shot,
      duration: Math.min(16, Number(snapped.toFixed(2))),
    };
  });
}

/**
 * Convenience helper to snap shots to a BPM beat grid.
 */
export function snapShotsToBeatGrid(shots: Shot[], bpm: number): Shot[] {
  return snapShotDurationsToBeatGrid(shots, {
    bpm: bpm || 120,
    timeSignature: [4, 4],
    downbeatsSeconds: [],
    beatsSeconds: [],
    snapEnabled: true,
    division: '1/4',
  });
}

/**
 * Local scratch dialogue audio synthesis via Web Speech API.
 */
export function speakScratchDialogue(
  text: string,
  options?: {
    rate?: number;
    pitch?: number;
    voiceName?: string;
    onEnd?: () => void;
  },
): { cancel: () => void } {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    options?.onEnd?.();
    return { cancel: () => {} };
  }

  window.speechSynthesis.cancel();
  if (!text || !text.trim()) {
    options?.onEnd?.();
    return { cancel: () => {} };
  }

  const utterance = new SpeechSynthesisUtterance(text.trim());
  utterance.rate = options?.rate ?? 1.0;
  utterance.pitch = options?.pitch ?? 1.0;

  if (options?.voiceName) {
    const voices = window.speechSynthesis.getVoices();
    const match = voices.find((v) => v.name === options.voiceName);
    if (match) utterance.voice = match;
  }

  utterance.onend = () => {
    options?.onEnd?.();
  };

  utterance.onerror = () => {
    options?.onEnd?.();
  };

  window.speechSynthesis.speak(utterance);

  return {
    cancel: () => {
      window.speechSynthesis.cancel();
    },
  };
}

/**
 * Convenience alias for speakScratchDialogue.
 */
export function speakDialogueLine(
  text: string,
  options?: {
    characterName?: string;
    rate?: number;
    pitch?: number;
    voiceName?: string;
    onEnd?: () => void;
  },
): { cancel: () => void } {
  return speakScratchDialogue(text, options);
}
