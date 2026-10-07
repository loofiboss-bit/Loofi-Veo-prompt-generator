/**
 * 3D WebGPU / Three.js Spatial Staging Service (v13.0.0 - Milestone 3)
 *
 * Provides real-time 3D spatial camera calculations, FOV cone projections,
 * depth of field boundaries, trajectory paths, and ControlNet-compatible
 * depth/normal/wireframe map generation.
 */

import * as THREE from 'three';
import type {
  SpatialCameraRig,
  CameraLensType,
  CameraAperture,
  CameraHeightLevel,
  CameraTransform3D,
  SpatialStagingPass,
  RenderedSpatialMap,
  SpatialSceneSubject,
  Vector3D,
} from '@core/types/spatialCamera';

export interface LensFovInfo {
  focalLengthMm: number;
  fov: number; // Vertical FOV in degrees (Three.js standard)
  horizontalFov: number; // Horizontal FOV in degrees
  isAnamorphic: boolean;
}

export const LENS_FOV_MAP: Record<CameraLensType, LensFovInfo> = {
  '16mm-ultra-wide': { focalLengthMm: 16, fov: 64.6, horizontalFov: 96.7, isAnamorphic: false },
  '24mm-wide': { focalLengthMm: 24, fov: 45.7, horizontalFov: 73.7, isAnamorphic: false },
  '35mm-cinematic': { focalLengthMm: 35, fov: 32.3, horizontalFov: 54.4, isAnamorphic: false },
  '50mm-natural': { focalLengthMm: 50, fov: 22.9, horizontalFov: 39.6, isAnamorphic: false },
  '85mm-portrait': { focalLengthMm: 85, fov: 13.6, horizontalFov: 23.9, isAnamorphic: false },
  '135mm-telephoto': { focalLengthMm: 135, fov: 8.6, horizontalFov: 15.2, isAnamorphic: false },
  'anamorphic-2.39': { focalLengthMm: 35, fov: 32.3, horizontalFov: 80.0, isAnamorphic: true },
};

export const APERTURE_DOF_RATIOS: Record<
  CameraAperture,
  { nearFraction: number; farFraction: number; totalMetersAt3m: number }
> = {
  'f/1.2': { nearFraction: 0.08, farFraction: 0.09, totalMetersAt3m: 0.51 },
  'f/1.8': { nearFraction: 0.12, farFraction: 0.15, totalMetersAt3m: 0.81 },
  'f/2.8': { nearFraction: 0.2, farFraction: 0.27, totalMetersAt3m: 1.41 },
  'f/4': { nearFraction: 0.3, farFraction: 0.47, totalMetersAt3m: 2.31 },
  'f/8': { nearFraction: 0.5, farFraction: 1.17, totalMetersAt3m: 5.01 },
  'f/16': { nearFraction: 0.67, farFraction: 6.67, totalMetersAt3m: 22.02 },
};

export const HEIGHT_LEVEL_METERS: Record<CameraHeightLevel, number> = {
  'ground-level': 0.15,
  'knee-level': 0.5,
  'waist-level': 1.0,
  'eye-level': 1.7,
  'high-angle': 2.8,
  'birds-eye': 5.5,
  'aerial-drone': 8.0,
};

/**
 * Calculates lens field-of-view parameters.
 */
export function calculateLensFov(lens: CameraLensType): LensFovInfo {
  return LENS_FOV_MAP[lens] ?? LENS_FOV_MAP['35mm-cinematic'];
}

/**
 * Calculates Depth of Field boundaries for a given aperture and subject focal distance.
 */
export function calculateApertureDof(
  aperture: CameraAperture,
  focalDistanceMeters = 3.0,
): { dofNearMeters: number; dofFarMeters: number; dofTotalMeters: number } {
  const config = APERTURE_DOF_RATIOS[aperture] ?? APERTURE_DOF_RATIOS['f/2.8'];
  const nearDist = Math.max(0.2, focalDistanceMeters * (1 - config.nearFraction));
  const farDist = focalDistanceMeters * (1 + config.farFraction);
  return {
    dofNearMeters: Number(nearDist.toFixed(2)),
    dofFarMeters: Number(farDist.toFixed(2)),
    dofTotalMeters: Number((farDist - nearDist).toFixed(2)),
  };
}

/**
 * Returns camera height in world meters.
 */
export function calculateCameraHeightMeters(heightLevel: CameraHeightLevel): number {
  return HEIGHT_LEVEL_METERS[heightLevel] ?? 1.7;
}

/**
 * Computes exact 3D camera transformation metrics at a specific progress along its trajectory.
 */
export function calculateCameraTransform(rig: SpatialCameraRig, progress = 0.5): CameraTransform3D {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const lensInfo = calculateLensFov(rig.lens);
  const baseHeight = calculateCameraHeightMeters(rig.heightLevel);
  const target: Vector3D = { x: 0, y: 1.2, z: 0 };
  let position: Vector3D = { x: 0, y: baseHeight, z: 3.5 };
  let effectiveFov = lensInfo.fov;
  let roll = rig.rollAngleDegrees || 0;

  switch (rig.trajectory) {
    case 'push-in': {
      // Moves from 4.8m down to 2.0m along z
      const z = 4.8 - clampedProgress * 2.8;
      position = { x: 0, y: baseHeight, z };
      break;
    }
    case 'pull-out': {
      // Moves from 2.0m out to 4.8m along z
      const z = 2.0 + clampedProgress * 2.8;
      position = { x: 0, y: baseHeight, z };
      break;
    }
    case 'pan-left': {
      // Camera stays fixed, target pans from right to left
      position = { x: 0, y: baseHeight, z: 3.5 };
      target.x = 1.2 - clampedProgress * 2.4;
      break;
    }
    case 'pan-right': {
      // Target pans from left to right
      position = { x: 0, y: baseHeight, z: 3.5 };
      target.x = -1.2 + clampedProgress * 2.4;
      break;
    }
    case 'tilt-up': {
      // Target moves upwards
      position = { x: 0, y: baseHeight, z: 3.5 };
      target.y = 0.4 + clampedProgress * 1.8;
      break;
    }
    case 'tilt-down': {
      // Target moves downwards
      position = { x: 0, y: baseHeight, z: 3.5 };
      target.y = 2.2 - clampedProgress * 1.8;
      break;
    }
    case 'crane-up': {
      // Camera rises vertically
      const y = 0.8 + clampedProgress * 3.4;
      position = { x: 0, y, z: 3.2 };
      target.y = 1.0;
      break;
    }
    case 'crane-down': {
      // Camera descends
      const y = 4.2 - clampedProgress * 3.4;
      position = { x: 0, y, z: 3.2 };
      target.y = 1.0;
      break;
    }
    case 'orbit-clockwise': {
      // Orbit around target
      const radius = 3.5;
      const angle = Math.PI * 0.5 + clampedProgress * Math.PI;
      position = {
        x: Number((Math.cos(angle) * radius).toFixed(3)),
        y: baseHeight,
        z: Number((Math.sin(angle) * radius).toFixed(3)),
      };
      break;
    }
    case 'orbit-counter-clockwise': {
      const radius = 3.5;
      const angle = Math.PI * 0.5 - clampedProgress * Math.PI;
      position = {
        x: Number((Math.cos(angle) * radius).toFixed(3)),
        y: baseHeight,
        z: Number((Math.sin(angle) * radius).toFixed(3)),
      };
      break;
    }
    case 'dolly-zoom-vertigo': {
      // Hitchcock Vertigo effect: camera pulls out from 2.2m to 5.2m while FOV narrows
      const z = 2.2 + clampedProgress * 3.0;
      position = { x: 0, y: baseHeight, z };
      // Dynamically zoom FOV to keep target size constant
      effectiveFov = Number((68 - clampedProgress * 42).toFixed(1));
      break;
    }
    case 'fpv-drone-dive': {
      // Dynamic aerial dive with swoop and roll
      const t = clampedProgress;
      position = {
        x: Number((3.0 * (1 - t)).toFixed(3)),
        y: Number((6.0 - t * 4.8).toFixed(3)),
        z: Number((5.5 - t * 3.8).toFixed(3)),
      };
      roll = Number((35 * Math.sin(t * Math.PI)).toFixed(1));
      break;
    }
    case 'dutch-angle-tracking': {
      // Lateral tracking with fixed dramatic roll
      const x = -1.8 + clampedProgress * 3.6;
      position = { x, y: baseHeight, z: 3.2 };
      roll = rig.rollAngleDegrees ? rig.rollAngleDegrees : -18;
      break;
    }
    case 'steadicam-follow': {
      // Follow shot with subtle handheld walking bobbing
      const z = 4.2 - clampedProgress * 2.2;
      const swayX = Math.sin(clampedProgress * 8 * Math.PI) * 0.08;
      const bobY = Math.abs(Math.cos(clampedProgress * 8 * Math.PI)) * 0.05;
      position = { x: swayX, y: baseHeight + bobY, z };
      break;
    }
    case 'static':
    default: {
      position = { x: 0, y: baseHeight, z: 3.5 };
      break;
    }
  }

  // Calculate distance from position to target
  const dx = position.x - target.x;
  const dy = position.y - target.y;
  const dz = position.z - target.z;
  const focalDistance = Number(Math.sqrt(dx * dx + dy * dy + dz * dz).toFixed(2));

  const dof = calculateApertureDof(rig.aperture, focalDistance);

  return {
    position,
    target,
    fov: effectiveFov,
    horizontalFov: lensInfo.horizontalFov,
    focalLengthMm: lensInfo.focalLengthMm,
    focalDistanceMeters: focalDistance,
    dofNearMeters: dof.dofNearMeters,
    dofFarMeters: dof.dofFarMeters,
    rollAngleDegrees: roll,
  };
}

/**
 * Calculates a series of 3D waypoints tracing the camera's trajectory for visualization.
 */
export function calculateTrajectoryWaypoints(
  rig: SpatialCameraRig,
  steps = 24,
): CameraTransform3D[] {
  const waypoints: CameraTransform3D[] = [];
  for (let i = 0; i <= steps; i++) {
    const progress = i / steps;
    waypoints.push(calculateCameraTransform(rig, progress));
  }
  return waypoints;
}

/**
 * Builds standard 3D subjects based on the SpatialCameraRig's spatialGrid placement.
 */
export function buildSpatialSceneSubjects(rig: SpatialCameraRig): SpatialSceneSubject[] {
  const subjects: SpatialSceneSubject[] = [];

  // Foreground Subject
  if (rig.spatialGrid.foregroundSubject) {
    subjects.push({
      id: 'foreground-subject',
      name: rig.spatialGrid.foregroundSubject,
      role: 'foreground',
      position: { x: -0.7, y: 0.85, z: 1.5 },
      scale: { x: 0.6, y: 1.7, z: 0.4 },
      color: '#38bdf8', // Cyan
    });
  }

  // Midground Subject (Hero target)
  subjects.push({
    id: 'midground-subject',
    name: rig.spatialGrid.midgroundSubject || 'Primary Subject',
    role: 'midground',
    position: { x: 0.1, y: 0.95, z: 0.0 },
    scale: { x: 0.7, y: 1.9, z: 0.5 },
    color: '#a855f7', // Purple
  });

  // Background Environment
  if (rig.spatialGrid.backgroundEnvironment) {
    subjects.push({
      id: 'background-environment',
      name: rig.spatialGrid.backgroundEnvironment,
      role: 'background',
      position: { x: 0, y: 2.2, z: -3.8 },
      scale: { x: 6.5, y: 4.5, z: 0.2 },
      color: '#475569', // Slate
    });
  }

  return subjects;
}

export interface RenderSpatialPassOptions {
  rig: SpatialCameraRig;
  pass: SpatialStagingPass;
  progress?: number;
  width?: number;
  height?: number;
  subjects?: SpatialSceneSubject[];
}

/**
 * Renders a 3D staging pass (staging, viewfinder, depth, normal, or wireframe)
 * using Three.js, with automatic fallback for headless/test environments.
 */
export async function renderSpatialPass(
  options: RenderSpatialPassOptions,
): Promise<RenderedSpatialMap> {
  const {
    rig,
    pass,
    progress = 0.5,
    width = 640,
    height = 360,
    subjects = buildSpatialSceneSubjects(rig),
  } = options;

  const transform = calculateCameraTransform(rig, progress);

  // If running in browser with canvas support, attempt Three.js rendering
  if (typeof document !== 'undefined') {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      // Check if WebGL is available
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (gl) {
        const renderer = new THREE.WebGLRenderer({
          canvas,
          antialias: true,
          alpha: true,
          preserveDrawingBuffer: true,
        });
        renderer.setSize(width, height, false);

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(
          pass === 'depth' ? 0x000000 : pass === 'normal' ? 0x8080ff : 0x090d16,
        );

        // Subject meshes
        subjects.forEach((subj) => {
          const geom = new THREE.BoxGeometry(subj.scale.x, subj.scale.y, subj.scale.z);
          let mat: THREE.Material;

          if (pass === 'depth') {
            mat = new THREE.MeshDepthMaterial();
          } else if (pass === 'normal') {
            mat = new THREE.MeshNormalMaterial();
          } else if (pass === 'wireframe') {
            mat = new THREE.MeshBasicMaterial({ wireframe: true, color: 0x38bdf8 });
          } else {
            mat = new THREE.MeshStandardMaterial({
              color: new THREE.Color(subj.color || '#a855f7'),
              roughness: 0.4,
              metalness: 0.1,
            });
          }

          const mesh = new THREE.Mesh(geom, mat);
          mesh.position.set(subj.position.x, subj.position.y, subj.position.z);
          scene.add(mesh);
        });

        // Add ground grid for staging pass
        if (pass === 'staging') {
          const grid = new THREE.GridHelper(10, 20, 0x38bdf8, 0x1e293b);
          scene.add(grid);

          // Add lighting
          const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
          const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
          dirLight.position.set(5, 8, 5);
          scene.add(ambientLight, dirLight);

          // Add camera visualizer representation
          const camGeom = new THREE.ConeGeometry(0.3, 0.6, 4);
          camGeom.rotateX(Math.PI / 2);
          const camMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, wireframe: true });
          const camMesh = new THREE.Mesh(camGeom, camMat);
          camMesh.position.set(transform.position.x, transform.position.y, transform.position.z);
          camMesh.lookAt(transform.target.x, transform.target.y, transform.target.z);
          scene.add(camMesh);

          // Exterior Staging Observer Camera
          const observerCam = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
          observerCam.position.set(4.5, 3.8, 5.2);
          observerCam.lookAt(0, 1.0, 0);

          renderer.render(scene, observerCam);
        } else {
          // Viewfinder / Depth / Normal / Wireframe camera through lens
          const directorCam = new THREE.PerspectiveCamera(transform.fov, width / height, 0.1, 100);
          directorCam.position.set(
            transform.position.x,
            transform.position.y,
            transform.position.z,
          );
          directorCam.lookAt(transform.target.x, transform.target.y, transform.target.z);
          if (transform.rollAngleDegrees) {
            directorCam.rotation.z += (transform.rollAngleDegrees * Math.PI) / 180;
          }

          if (pass !== 'depth' && pass !== 'normal') {
            const ambient = new THREE.AmbientLight(0xffffff, 0.7);
            const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
            keyLight.position.set(3, 6, 4);
            scene.add(ambient, keyLight);
          }

          renderer.render(scene, directorCam);
        }

        const dataUrl = canvas.toDataURL('image/png');
        renderer.dispose();

        return {
          pass,
          dataUrl,
          width,
          height,
          mimeType: 'image/png',
          timestamp: Date.now(),
        };
      }
    } catch {
      // Fallback below
    }
  }

  // Graceful Canvas / Procedural Fallback (for Node, headless CI, or environments without WebGL)
  const fallbackDataUrl = generateProceduralFallbackMap(pass, width, height, transform, subjects);
  return {
    pass,
    dataUrl: fallbackDataUrl,
    width,
    height,
    mimeType: 'image/png',
    timestamp: Date.now(),
  };
}

/**
 * Generates deterministic fallback map dataURL for tests and environments without active WebGL.
 */
function generateProceduralFallbackMap(
  pass: SpatialStagingPass,
  width: number,
  height: number,
  transform: CameraTransform3D,
  subjects: SpatialSceneSubject[],
): string {
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      if (pass === 'depth') {
        ctx.fillStyle = '#050505';
        ctx.fillRect(0, 0, width, height);
        // Render grayscale depth slices for subjects
        subjects.forEach((s, idx) => {
          const depthVal = Math.floor(220 - idx * 60);
          ctx.fillStyle = `rgb(${depthVal}, ${depthVal}, ${depthVal})`;
          const cx = width * (0.35 + idx * 0.2);
          const cy = height * 0.45;
          ctx.fillRect(cx - 40, cy - 60, 80, 120);
        });
      } else if (pass === 'normal') {
        // ControlNet standard view normal background (view plane normal = 128, 128, 255)
        ctx.fillStyle = 'rgb(128, 128, 255)';
        ctx.fillRect(0, 0, width, height);
        subjects.forEach((_, idx) => {
          ctx.fillStyle = idx === 0 ? 'rgb(255, 128, 128)' : 'rgb(128, 255, 128)';
          const cx = width * (0.35 + idx * 0.2);
          const cy = height * 0.45;
          ctx.fillRect(cx - 35, cy - 55, 70, 110);
        });
      } else if (pass === 'wireframe') {
        ctx.fillStyle = '#0a0f1d';
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        subjects.forEach((_, idx) => {
          const cx = width * (0.35 + idx * 0.2);
          const cy = height * 0.45;
          ctx.strokeRect(cx - 35, cy - 55, 70, 110);
        });
      } else {
        // Staging / Viewfinder
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#38bdf8';
        ctx.font = '12px monospace';
        ctx.fillText(`Pass: ${pass.toUpperCase()} | FOV: ${transform.fov}°`, 16, 28);
      }
      return canvas.toDataURL('image/png');
    }
  }

  // Pure Base64 1x1 transparent PNG fallback if canvas is entirely unavailable
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
}

/**
 * Downloads a rendered spatial map as a PNG file.
 */
export function exportSpatialMapAsFile(
  rendered: RenderedSpatialMap,
  filename = `spatial-${rendered.pass}-map.png`,
): void {
  if (typeof document === 'undefined') return;
  const link = document.createElement('a');
  link.href = rendered.dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
