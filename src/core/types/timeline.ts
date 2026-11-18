/**
 * Timeline, Clip, Transition, and Effect Types
 */

export interface TransitionType {
  type: 'cut' | 'dissolve' | 'fade_black' | 'wipe_left';
  duration: number;
}

export type ClipTransition = TransitionType;

// --- MODULAR EFFECTS SYSTEM ---

export type EffectType = 'color' | 'chroma' | 'shake';

export interface BaseEffect {
  id: string;
  type: EffectType;
  isEnabled: boolean;
  name?: string;
}

export interface ColorGradeEffect extends BaseEffect {
  type: 'color';
  brightness: number; // 0 to 2, 1 is default
  contrast: number; // 0 to 2, 1 is default
  saturation: number; // 0 to 2, 1 is default
  sepia: number; // 0 to 1
  hueRotate: number; // -180 to 180 degrees
}

export interface ChromaKeyEffect extends BaseEffect {
  type: 'chroma';
  color: string; // Hex e.g., #00FF00
  similarity: number; // 0 to 1
  smoothness: number; // 0 to 1
  spill: number; // 0 to 1
}

export interface CameraShakeEffect extends BaseEffect {
  type: 'shake';
  intensity: number; // 0 to 1
  speed: number; // 0.1 to 5
  scale: number; // 1.0 to 1.5 (Overscan to prevent black edges)
}

export type VideoEffect = ColorGradeEffect | ChromaKeyEffect | CameraShakeEffect;

// --- END EFFECTS SYSTEM ---

export interface MotionKeyframe {
  x: number;
  y: number;
  zoom: number;
}

export interface MotionConfig {
  start: MotionKeyframe;
  end: MotionKeyframe;
  ease: string; // 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out'
}

export interface TextOverlay {
  id: string;
  text: string;
  startTime: number;
  duration: number;
  position: { x: number; y: number };
  style: {
    fontSize: number;
    color: string;
    backgroundColor?: string;
    backgroundOpacity?: number;
    fontFamily?: string;
  };
  animationIn?: 'none' | 'fade' | 'slide_up' | 'zoom' | 'typewriter';
  animationOut?: 'none' | 'fade' | 'slide_down' | 'zoom';
  animationDuration?: number;
}

export interface ColorGrade {
  contrast: number;
  saturation: number;
  brightness: number;
  sepia: number;
  hueRotate: number;
  gamma_r?: number;
  gamma_g?: number;
  gamma_b?: number;
}

export type ColorGradeParams = ColorGrade;

export interface CameraEffect {
  type: 'static' | 'handheld' | 'drift' | 'zoom_in' | 'zoom_out';
  intensity: number;
  scale?: number;
  speed?: number;
}

export interface Caption {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  style: 'pop' | 'karaoke' | 'classic';
}

export interface TimelineTrack {
  id: string;
  label: string;
  type: 'video' | 'audio' | 'text';
  trackType: 'captions' | 'dialogue' | 'sfx' | 'music' | 'ambience';
  zIndex: number;
  /** Tracks remain enabled by default when loading older project files. */
  active?: boolean;
  /** Track mute is separate from each clip's stored source volume. */
  muted?: boolean;
}

export interface Keyframe {
  id: string;
  time: number;
  value: number;
  property: string;
  easing: string; // 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out'
}

export interface TransformProps {
  scale: number;
  position: { x: number; y: number };
  rotation: number;
  opacity: number;
}

export interface VolumeKeyframe {
  time: number;
  value: number;
}

export interface TimelineClip {
  id: string;
  /** Caption linkage to a timeline clip, independent of its source media identity. */
  sourceClipId?: string;
  resourceId: string | number;
  trackId: string;
  startTime: number;
  duration: number;
  offset: number;
  type: 'video' | 'audio' | 'text' | 'image';
  label: string;
  isLoading?: boolean;
  transition?: ClipTransition;
  volume?: number;
  volumeKeyframes?: VolumeKeyframe[];
  opacity?: number;
  panning?: { x: number; z: number };
  caption?: Caption;
  transform?: TransformProps;
  keyframes?: Keyframe[];

  // NEW MODULAR EFFECTS
  effects?: VideoEffect[];

  // Takes System
  selectedTakeId?: string;

  // Deprecated / Legacy Fields (Kept for compatibility during migration)
  colorGrade?: ColorGradeParams;
  cameraEffect?: CameraEffect;

  reactivity?: {
    targetProperty: 'scale' | 'opacity' | 'brightness';
    frequencyRange: 'bass' | 'mids' | 'highs';
    sensitivity: number; // 0 to 2.0
  };

  // Magic Mask
  maskSequence?: string[];
}

export interface TimelineState {
  tracks: TimelineTrack[];
  clips: TimelineClip[];
  zoomLevel: number;
  currentTime: number;
}
