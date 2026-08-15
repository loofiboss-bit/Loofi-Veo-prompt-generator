/**
 * v12 3D Spatial Camera Director & Veo 3.1 Rig contracts.
 */

export type CameraLensType =
  | '16mm-ultra-wide'
  | '24mm-wide'
  | '35mm-cinematic'
  | '50mm-natural'
  | '85mm-portrait'
  | '135mm-telephoto'
  | 'anamorphic-2.39';

export type CameraAperture = 'f/1.2' | 'f/1.8' | 'f/2.8' | 'f/4' | 'f/8' | 'f/16';

export type CameraShutterAngle = '90deg' | '180deg' | '360deg';

export type CameraHeightLevel =
  | 'ground-level'
  | 'knee-level'
  | 'waist-level'
  | 'eye-level'
  | 'high-angle'
  | 'birds-eye'
  | 'aerial-drone';

export type CameraTrajectory =
  | 'static'
  | 'push-in'
  | 'pull-out'
  | 'pan-left'
  | 'pan-right'
  | 'tilt-up'
  | 'tilt-down'
  | 'crane-up'
  | 'crane-down'
  | 'orbit-clockwise'
  | 'orbit-counter-clockwise'
  | 'dolly-zoom-vertigo'
  | 'fpv-drone-dive'
  | 'dutch-angle-tracking'
  | 'steadicam-follow';

export type CameraMovementSpeed = 'slow-subtle' | 'smooth-cinematic' | 'rapid-dynamic' | 'whip-pan';

export interface SpatialGridPlacement {
  foregroundSubject?: string;
  midgroundSubject?: string;
  backgroundEnvironment?: string;
  focalDepthTarget?: 'foreground' | 'midground' | 'background' | 'deep-focus';
}

export interface SpatialCameraRig {
  lens: CameraLensType;
  aperture: CameraAperture;
  shutterAngle: CameraShutterAngle;
  heightLevel: CameraHeightLevel;
  trajectory: CameraTrajectory;
  trajectorySpeed: CameraMovementSpeed;
  rollAngleDegrees?: number;
  spatialGrid: SpatialGridPlacement;
  customDirectives?: string;
}

export interface CompiledCameraDirectives {
  promptFragment: string;
  negativePromptFragment?: string;
  settingsNotes: string[];
  lensDescription: string;
  motionDescription: string;
  depthDescription: string;
}
