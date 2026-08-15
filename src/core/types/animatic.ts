/**
 * v12 Previz Animatic & Multi-Track Audio-Visual Timeline contracts.
 */

export type AnimaticMotionType =
  | 'static'
  | 'ken-burns-zoom-in'
  | 'ken-burns-zoom-out'
  | 'pan-left-to-right'
  | 'pan-right-to-left'
  | 'tilt-up'
  | 'tilt-down'
  | 'dutch-tilt-dynamic'
  | 'whip-dissolve';

export interface AnimaticKeyframe {
  timePercent: number; // 0 to 100
  scale: number; // e.g. 1.0 to 1.5
  translateX: number; // in % of frame width
  translateY: number; // in % of frame height
  rotateDegrees: number; // e.g. -5 to 5
  opacity: number; // 0 to 1.0
}

export interface AnimaticShotConfig {
  shotId: number;
  motionType: AnimaticMotionType;
  customKeyframes?: AnimaticKeyframe[];
  scratchDialogueVoice?: string;
  scratchDialogueRate?: number;
  scratchDialoguePitch?: number;
  foleyGain?: number;
}

export interface TimelineBeatGrid {
  bpm: number;
  timeSignature: [number, number]; // e.g. [4, 4]
  downbeatsSeconds: number[];
  beatsSeconds: number[];
  snapEnabled?: boolean;
  division?: string;
}

export interface TimelineVideoClip {
  id: string;
  shotId: number;
  trackId: string;
  sourceType: 'generated-video' | 'storyboard-animatic' | 'reference-image';
  assetId?: string;
  mediaUrl?: string;
  startSeconds: number;
  durationSeconds: number;
  speed: number;
  opacity: number;
  promptSnippet?: string;
  continuitySnapshotHash?: string;
}

export interface TimelineAudioClip {
  id: string;
  trackId: string;
  role: 'music' | 'dialogue' | 'sfx-foley' | 'ambience';
  assetId?: string;
  mediaUrl?: string;
  startSeconds: number;
  durationSeconds: number;
  volume: number;
  fadeInSeconds?: number;
  fadeOutSeconds?: number;
  textTranscript?: string;
}

export interface TimelineVideoTrack {
  id: string;
  name: string;
  role: 'primary-takes' | 'b-roll' | 'previz-animatic' | 'reference-overlay';
  muted: boolean;
  locked: boolean;
  clips: TimelineVideoClip[];
}

export interface TimelineAudioTrack {
  id: string;
  name: string;
  role: 'music' | 'dialogue' | 'sfx-foley' | 'ambience';
  volume: number;
  muted: boolean;
  locked: boolean;
  clips: TimelineAudioClip[];
}

export interface MultiTrackTimeline {
  schemaVersion: 1;
  durationSeconds: number;
  fps: 24 | 30 | 60;
  videoTracks: TimelineVideoTrack[];
  audioTracks: TimelineAudioTrack[];
  beatGrid?: TimelineBeatGrid;
  animaticShots: Record<number, AnimaticShotConfig>;
}
