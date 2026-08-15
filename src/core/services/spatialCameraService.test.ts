import { describe, it, expect } from 'vitest';
import {
  compileSpatialCameraRig,
  inferSpatialCameraFromText,
  DEFAULT_SPATIAL_CAMERA_RIG,
} from './spatialCameraService';
import type { SpatialCameraRig } from '@core/types/spatialCamera';

describe('spatialCameraService', () => {
  it('compiles default spatial camera rig correctly', () => {
    const compiled = compileSpatialCameraRig(DEFAULT_SPATIAL_CAMERA_RIG);
    expect(compiled.promptFragment).toContain('Camera: 35mm cinematic lens');
    expect(compiled.promptFragment).toContain('Framing: eye-level perspective');
    expect(compiled.promptFragment).toContain('Movement: smooth slow dolly push-in');
    expect(compiled.promptFragment).toContain('Aperture: f/2.8 balanced cinematic depth of field');
    expect(compiled.settingsNotes.length).toBeGreaterThan(0);
  });

  it('compiles anamorphic 2.39:1 rig with dutch tilt and depth elements', () => {
    const customRig: SpatialCameraRig = {
      lens: 'anamorphic-2.39',
      aperture: 'f/1.2',
      shutterAngle: '90deg',
      heightLevel: 'ground-level',
      trajectory: 'dutch-angle-tracking',
      trajectorySpeed: 'rapid-dynamic',
      rollAngleDegrees: -20,
      spatialGrid: {
        foregroundSubject: 'Cyberpunk detective in trenchcoat',
        midgroundSubject: 'Holographic billboard flickering',
        backgroundEnvironment: 'Neon skyscrapers in rain',
        focalDepthTarget: 'foreground',
      },
      customDirectives: 'Maintain intense rim light reflection',
    };

    const compiled = compileSpatialCameraRig(customRig);
    expect(compiled.promptFragment).toContain('2.39:1 anamorphic cinema lens');
    expect(compiled.promptFragment).toContain('Dutch tilt: -20 degrees');
    expect(compiled.promptFragment).toContain('foreground: Cyberpunk detective in trenchcoat');
    expect(compiled.promptFragment).toContain('background: Neon skyscrapers in rain');
    expect(compiled.promptFragment).toContain('Directives: Maintain intense rim light reflection');
  });

  it('infers spatial camera from descriptive text', () => {
    const inferred = inferSpatialCameraFromText(
      'Aerial 360 orbit shot with wide angle lens around mountain peak',
    );
    expect(inferred.heightLevel).toBe('birds-eye');
    expect(inferred.trajectory).toBe('orbit-clockwise');
    expect(inferred.lens).toBe('24mm-wide');
  });
});
