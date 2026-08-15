/**
 * Spatial Camera Service (v12.0.0)
 *
 * Compiles 3D spatial camera rigs, focal lengths, shutter angles, and trajectories
 * into deterministic Google Flow / Veo 3.1 camera directives.
 */

import type {
  SpatialCameraRig,
  CompiledCameraDirectives,
  CameraLensType,
  CameraTrajectory,
  CameraAperture,
  CameraHeightLevel,
} from '@core/types/spatialCamera';

export const DEFAULT_SPATIAL_CAMERA_RIG: SpatialCameraRig = {
  lens: '35mm-cinematic',
  aperture: 'f/2.8',
  shutterAngle: '180deg',
  heightLevel: 'eye-level',
  trajectory: 'push-in',
  trajectorySpeed: 'smooth-cinematic',
  rollAngleDegrees: 0,
  spatialGrid: {
    focalDepthTarget: 'foreground',
  },
};

export const LENS_DESCRIPTIONS: Record<CameraLensType, string> = {
  '16mm-ultra-wide': '16mm ultra-wide angle lens, expansive perspective with dynamic edge geometry',
  '24mm-wide': '24mm wide angle lens, deep environmental context with clear subject presence',
  '35mm-cinematic': '35mm cinematic lens, natural storytelling field of view',
  '50mm-natural':
    '50mm standard prime lens, natural human eye perspective with balanced compression',
  '85mm-portrait':
    '85mm portrait telephoto lens, beautiful shallow depth of field and subject isolation',
  '135mm-telephoto': '135mm telephoto lens, intense background compression and dramatic isolation',
  'anamorphic-2.39':
    '2.39:1 anamorphic cinema lens, horizontal lens flares and cinematic oval bokeh',
};

export const TRAJECTORY_DESCRIPTIONS: Record<CameraTrajectory, string> = {
  static: 'locked-off tripod static framing',
  'push-in': 'smooth slow dolly push-in toward the subject',
  'pull-out': 'smooth cinematic dolly pull-out revealing the surroundings',
  'pan-left': 'horizontal camera pan to the left',
  'pan-right': 'horizontal camera pan to the right',
  'tilt-up': 'vertical camera tilt upwards',
  'tilt-down': 'vertical camera tilt downwards',
  'crane-up': 'vertical crane / jib ascension over the scene',
  'crane-down': 'descending crane move toward ground level',
  'orbit-clockwise': '360-degree clockwise circular orbit around the subject',
  'orbit-counter-clockwise': '360-degree counter-clockwise circular orbit around the subject',
  'dolly-zoom-vertigo': 'vertigo dolly-zoom effect with optical perspective distortion',
  'fpv-drone-dive': 'dynamic high-speed FPV drone dive and swoop',
  'dutch-angle-tracking': 'tilted Dutch angle tracking shot with stylistic tension',
  'steadicam-follow': 'fluid handheld Steadicam following closely behind subject',
};

export const HEIGHT_DESCRIPTIONS: Record<CameraHeightLevel, string> = {
  'ground-level': 'ground level low-angle perspective',
  'knee-level': 'knee-level low perspective',
  'waist-level': 'waist-level medium perspective',
  'eye-level': 'eye-level perspective',
  'high-angle': 'high-angle downward looking perspective',
  'birds-eye': 'top-down overhead birds-eye view',
  'aerial-drone': 'sweeping aerial drone altitude',
};

export const APERTURE_DESCRIPTIONS: Record<CameraAperture, string> = {
  'f/1.2': 'ultra-shallow f/1.2 depth of field with creamy circular bokeh background blur',
  'f/1.8': 'shallow f/1.8 cinematic depth of field, sharp foreground subject and soft background',
  'f/2.8': 'f/2.8 balanced cinematic depth of field with gentle subject separation',
  'f/4': 'f/4 moderate depth of field with clear subject and discernible environment',
  'f/8': 'f/8 deep focus with sharp details throughout midground and background',
  'f/16': 'f/16 maximum deep focus with crisp edge-to-edge sharpness',
};

/**
 * Compiles a SpatialCameraRig into deterministic camera prompt fragments and settings notes.
 */
export function compileSpatialCameraRig(rig: SpatialCameraRig): CompiledCameraDirectives {
  const lensDesc = LENS_DESCRIPTIONS[rig.lens] ?? LENS_DESCRIPTIONS['35mm-cinematic'];
  const motionDesc = TRAJECTORY_DESCRIPTIONS[rig.trajectory] ?? TRAJECTORY_DESCRIPTIONS['push-in'];
  const heightDesc = HEIGHT_DESCRIPTIONS[rig.heightLevel] ?? HEIGHT_DESCRIPTIONS['eye-level'];
  const apertureDesc = APERTURE_DESCRIPTIONS[rig.aperture] ?? APERTURE_DESCRIPTIONS['f/2.8'];

  const depthElements: string[] = [];
  if (rig.spatialGrid.foregroundSubject) {
    depthElements.push(`foreground: ${rig.spatialGrid.foregroundSubject.trim()}`);
  }
  if (rig.spatialGrid.midgroundSubject) {
    depthElements.push(`midground: ${rig.spatialGrid.midgroundSubject.trim()}`);
  }
  if (rig.spatialGrid.backgroundEnvironment) {
    depthElements.push(`background: ${rig.spatialGrid.backgroundEnvironment.trim()}`);
  }

  const depthDesc =
    depthElements.length > 0
      ? `Spatial staging: [${depthElements.join(' | ')}]`
      : 'Harmonious focal depth';

  // Build the compiled prompt camera directive
  const cameraParts: string[] = [
    `Camera: ${lensDesc}`,
    `Framing: ${heightDesc}`,
    `Movement: ${motionDesc} (${rig.trajectorySpeed})`,
    `Aperture: ${apertureDesc}`,
  ];

  if (rig.rollAngleDegrees && rig.rollAngleDegrees !== 0) {
    cameraParts.push(`Dutch tilt: ${rig.rollAngleDegrees} degrees`);
  }

  if (depthElements.length > 0) {
    cameraParts.push(depthDesc);
  }

  if (rig.customDirectives?.trim()) {
    cameraParts.push(`Directives: ${rig.customDirectives.trim()}`);
  }

  const promptFragment = `[${cameraParts.join(', ')}]`;

  const settingsNotes: string[] = [
    `Lens: ${rig.lens} | Aperture: ${rig.aperture} | Shutter: ${rig.shutterAngle}`,
    `Trajectory: ${rig.trajectory} (${rig.trajectorySpeed}) at ${rig.heightLevel}`,
  ];

  if (depthElements.length > 0) {
    settingsNotes.push(`Spatial depth staging: ${depthElements.join('; ')}`);
  }

  return {
    promptFragment,
    settingsNotes,
    lensDescription: lensDesc,
    motionDescription: motionDesc,
    depthDescription: depthDesc,
  };
}

/**
 * Generates a SpatialCameraRig from existing free-form prompt text.
 */
export function inferSpatialCameraFromText(cameraText: string): SpatialCameraRig {
  const normalized = (cameraText || '').toLowerCase();
  const rig: SpatialCameraRig = { ...DEFAULT_SPATIAL_CAMERA_RIG };

  if (
    normalized.includes('16mm') ||
    normalized.includes('ultra-wide') ||
    normalized.includes('fisheye')
  ) {
    rig.lens = '16mm-ultra-wide';
  } else if (normalized.includes('24mm') || normalized.includes('wide')) {
    rig.lens = '24mm-wide';
  } else if (normalized.includes('85mm') || normalized.includes('portrait')) {
    rig.lens = '85mm-portrait';
  } else if (normalized.includes('135mm') || normalized.includes('telephoto')) {
    rig.lens = '135mm-telephoto';
  } else if (normalized.includes('anamorphic') || normalized.includes('2.39')) {
    rig.lens = 'anamorphic-2.39';
  } else if (normalized.includes('50mm')) {
    rig.lens = '50mm-natural';
  }

  if (normalized.includes('orbit') || normalized.includes('360')) {
    rig.trajectory = 'orbit-clockwise';
  } else if (
    normalized.includes('pull out') ||
    normalized.includes('zoom out') ||
    normalized.includes('dolly out')
  ) {
    rig.trajectory = 'pull-out';
  } else if (normalized.includes('crane') || normalized.includes('jib')) {
    rig.trajectory = 'crane-up';
  } else if (normalized.includes('drone') || normalized.includes('fpv')) {
    rig.trajectory = 'fpv-drone-dive';
  } else if (normalized.includes('dutch')) {
    rig.trajectory = 'dutch-angle-tracking';
    rig.rollAngleDegrees = 15;
  } else if (normalized.includes('steadicam') || normalized.includes('follow')) {
    rig.trajectory = 'steadicam-follow';
  } else if (
    normalized.includes('static') ||
    normalized.includes('tripod') ||
    normalized.includes('lock')
  ) {
    rig.trajectory = 'static';
  }

  if (
    normalized.includes('aerial') ||
    normalized.includes('birds eye') ||
    normalized.includes('overhead')
  ) {
    rig.heightLevel = 'birds-eye';
  } else if (normalized.includes('low angle') || normalized.includes('ground')) {
    rig.heightLevel = 'ground-level';
  } else if (normalized.includes('high angle')) {
    rig.heightLevel = 'high-angle';
  }

  return rig;
}
