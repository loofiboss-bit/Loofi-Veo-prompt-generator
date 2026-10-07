import { describe, it, expect, vi } from 'vitest';
import {
  calculateLensFov,
  calculateApertureDof,
  calculateCameraHeightMeters,
  calculateCameraTransform,
  calculateTrajectoryWaypoints,
  buildSpatialSceneSubjects,
  renderSpatialPass,
  exportSpatialMapAsFile,
} from './spatialCamera3dService';
import { DEFAULT_SPATIAL_CAMERA_RIG } from './spatialCameraService';
import type { SpatialCameraRig } from '@core/types/spatialCamera';

describe('spatialCamera3dService', () => {
  describe('calculateLensFov', () => {
    it('returns wide FOV for 16mm lens', () => {
      const fov16 = calculateLensFov('16mm-ultra-wide');
      expect(fov16.focalLengthMm).toBe(16);
      expect(fov16.horizontalFov).toBeGreaterThan(90);
      expect(fov16.isAnamorphic).toBe(false);
    });

    it('returns telephoto FOV for 135mm lens', () => {
      const fov135 = calculateLensFov('135mm-telephoto');
      expect(fov135.focalLengthMm).toBe(135);
      expect(fov135.horizontalFov).toBeLessThan(20);
    });

    it('flags anamorphic 2.39 correctly', () => {
      const ana = calculateLensFov('anamorphic-2.39');
      expect(ana.isAnamorphic).toBe(true);
      expect(ana.horizontalFov).toBe(80.0);
    });
  });

  describe('calculateApertureDof', () => {
    it('calculates ultra shallow DOF for f/1.2', () => {
      const dof = calculateApertureDof('f/1.2', 3.0);
      expect(dof.dofTotalMeters).toBeLessThan(1.0);
      expect(dof.dofNearMeters).toBeLessThan(3.0);
      expect(dof.dofFarMeters).toBeGreaterThan(3.0);
    });

    it('calculates deep focus for f/16', () => {
      const dof = calculateApertureDof('f/16', 3.0);
      expect(dof.dofTotalMeters).toBeGreaterThan(10.0);
      expect(dof.dofFarMeters).toBeGreaterThan(15.0);
    });
  });

  describe('calculateCameraHeightMeters', () => {
    it('returns grounded elevation for ground-level', () => {
      expect(calculateCameraHeightMeters('ground-level')).toBeCloseTo(0.15);
    });

    it('returns human eye level for eye-level', () => {
      expect(calculateCameraHeightMeters('eye-level')).toBeCloseTo(1.7);
    });

    it('returns high elevation for aerial-drone', () => {
      expect(calculateCameraHeightMeters('aerial-drone')).toBe(8.0);
    });
  });

  describe('calculateCameraTransform', () => {
    it('computes push-in trajectory moving closer to subject', () => {
      const start = calculateCameraTransform(DEFAULT_SPATIAL_CAMERA_RIG, 0.0);
      const end = calculateCameraTransform(DEFAULT_SPATIAL_CAMERA_RIG, 1.0);
      expect(start.position.z).toBeGreaterThan(end.position.z);
      expect(end.focalDistanceMeters).toBeLessThan(start.focalDistanceMeters);
    });

    it('computes orbit-clockwise in a circular path', () => {
      const rig: SpatialCameraRig = {
        ...DEFAULT_SPATIAL_CAMERA_RIG,
        trajectory: 'orbit-clockwise',
      };
      const mid = calculateCameraTransform(rig, 0.5);
      const radius = Math.sqrt(mid.position.x * mid.position.x + mid.position.z * mid.position.z);
      expect(radius).toBeCloseTo(3.5, 1);
    });

    it('computes dolly-zoom vertigo narrowing FOV as camera pulls back', () => {
      const rig: SpatialCameraRig = {
        ...DEFAULT_SPATIAL_CAMERA_RIG,
        trajectory: 'dolly-zoom-vertigo',
      };
      const start = calculateCameraTransform(rig, 0.0);
      const end = calculateCameraTransform(rig, 1.0);
      expect(end.position.z).toBeGreaterThan(start.position.z);
      expect(end.fov).toBeLessThan(start.fov);
    });

    it('applies Dutch angle tracking roll', () => {
      const rig: SpatialCameraRig = {
        ...DEFAULT_SPATIAL_CAMERA_RIG,
        trajectory: 'dutch-angle-tracking',
        rollAngleDegrees: -25,
      };
      const t = calculateCameraTransform(rig, 0.5);
      expect(t.rollAngleDegrees).toBe(-25);
    });

    it('computes FPV drone dive descent and roll', () => {
      const rig: SpatialCameraRig = {
        ...DEFAULT_SPATIAL_CAMERA_RIG,
        trajectory: 'fpv-drone-dive',
      };
      const start = calculateCameraTransform(rig, 0.0);
      const end = calculateCameraTransform(rig, 1.0);
      expect(start.position.y).toBeGreaterThan(end.position.y);
    });
  });

  describe('calculateTrajectoryWaypoints', () => {
    it('generates correct number of steps for path visualization', () => {
      const waypoints = calculateTrajectoryWaypoints(DEFAULT_SPATIAL_CAMERA_RIG, 10);
      expect(waypoints.length).toBe(11);
      expect(waypoints[0].position.z).toBeGreaterThan(waypoints[10].position.z);
    });
  });

  describe('buildSpatialSceneSubjects', () => {
    it('builds subjects from spatial grid descriptions', () => {
      const rig: SpatialCameraRig = {
        ...DEFAULT_SPATIAL_CAMERA_RIG,
        spatialGrid: {
          foregroundSubject: 'Neo Cyberpunk Runner',
          midgroundSubject: 'Hologram Beacon',
          backgroundEnvironment: 'Megacity Skyscrapers',
        },
      };
      const subjects = buildSpatialSceneSubjects(rig);
      expect(subjects.length).toBe(3);
      expect(subjects.find((s) => s.role === 'foreground')?.name).toBe('Neo Cyberpunk Runner');
      expect(subjects.find((s) => s.role === 'midground')?.name).toBe('Hologram Beacon');
      expect(subjects.find((s) => s.role === 'background')?.name).toBe('Megacity Skyscrapers');
    });
  });

  describe('renderSpatialPass', () => {
    it('renders depth pass and produces PNG dataUrl', async () => {
      const result = await renderSpatialPass({
        rig: DEFAULT_SPATIAL_CAMERA_RIG,
        pass: 'depth',
        width: 320,
        height: 180,
      });

      expect(result.pass).toBe('depth');
      expect(result.dataUrl).toContain('data:image/png');
      expect(result.width).toBe(320);
      expect(result.height).toBe(180);
      expect(result.timestamp).toBeGreaterThan(0);
    });

    it('renders normal pass', async () => {
      const result = await renderSpatialPass({
        rig: DEFAULT_SPATIAL_CAMERA_RIG,
        pass: 'normal',
      });
      expect(result.pass).toBe('normal');
      expect(result.dataUrl).toContain('data:image/png');
    });

    it('renders wireframe pass', async () => {
      const result = await renderSpatialPass({
        rig: DEFAULT_SPATIAL_CAMERA_RIG,
        pass: 'wireframe',
      });
      expect(result.pass).toBe('wireframe');
      expect(result.dataUrl).toContain('data:image/png');
    });

    it('renders staging observer pass', async () => {
      const result = await renderSpatialPass({
        rig: DEFAULT_SPATIAL_CAMERA_RIG,
        pass: 'staging',
      });
      expect(result.pass).toBe('staging');
      expect(result.dataUrl).toContain('data:image/png');
    });
  });

  describe('exportSpatialMapAsFile', () => {
    it('creates download anchor and clicks it in document environment', () => {
      const appendSpy = vi.spyOn(document.body, 'appendChild');
      const removeSpy = vi.spyOn(document.body, 'removeChild');

      exportSpatialMapAsFile({
        pass: 'depth',
        dataUrl: 'data:image/png;base64,mockDepth',
        width: 640,
        height: 360,
        mimeType: 'image/png',
        timestamp: Date.now(),
      });

      expect(appendSpy).toHaveBeenCalled();
      expect(removeSpy).toHaveBeenCalled();
    });
  });
});
