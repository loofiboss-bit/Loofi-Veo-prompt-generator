import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import type {
  SpatialCameraRig,
  SpatialStagingPass,
  RenderedSpatialMap,
} from '@core/types/spatialCamera';
import {
  calculateCameraTransform,
  calculateTrajectoryWaypoints,
  buildSpatialSceneSubjects,
  renderSpatialPass,
  exportSpatialMapAsFile,
} from '@core/services/spatialCamera3dService';
import Icon from '@shared/components/ui/Icon';

export interface SpatialCamera3dViewportProps {
  rig: SpatialCameraRig;
  onUpdateRig?: (patch: Partial<SpatialCameraRig>) => void;
  onExportMap?: (renderedMap: RenderedSpatialMap) => void;
  onAddReferenceImage?: (dataUrl: string, name: string) => void;
  className?: string;
}

export const SpatialCamera3dViewport: React.FC<SpatialCamera3dViewportProps> = ({
  rig,
  onExportMap,
  onAddReferenceImage,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [activePass, setActivePass] = useState<SpatialStagingPass>('staging');
  const [progress, setProgress] = useState(0.5);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lastExport, setLastExport] = useState<RenderedSpatialMap | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [webGlSupported, setWebGlSupported] = useState(true);

  // Trajectory metrics
  const transform = useMemo(() => calculateCameraTransform(rig, progress), [rig, progress]);
  const waypoints = useMemo(() => calculateTrajectoryWaypoints(rig, 32), [rig]);
  const subjects = useMemo(() => buildSpatialSceneSubjects(rig), [rig]);

  // Orbit angles for exterior staging camera
  const stagingOrbitRef = useRef({ theta: 0.8, phi: 0.6, radius: 7.5 });
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });

  // Animation frame loop for playback
  useEffect(() => {
    if (!isPlaying) return;

    let animId: number;
    let lastTimestamp: number | null = null;
    const durationSec =
      rig.trajectorySpeed === 'slow-subtle'
        ? 6.0
        : rig.trajectorySpeed === 'rapid-dynamic'
          ? 2.5
          : rig.trajectorySpeed === 'whip-pan'
            ? 1.2
            : 4.0;

    const tick = (timestamp: number) => {
      if (lastTimestamp !== null) {
        const delta = (timestamp - lastTimestamp) / 1000;
        setProgress((prev) => {
          const next = prev + delta / durationSec;
          if (next >= 1.0) {
            setIsPlaying(false);
            return 1.0;
          }
          return next;
        });
      }
      lastTimestamp = timestamp;
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, rig.trajectorySpeed]);

  // Three.js Scene Setup & Render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) {
        setWebGlSupported(false);
        return;
      }

      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true,
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      const width = canvas.clientWidth || 640;
      const height = canvas.clientHeight || 360;
      renderer.setSize(width, height, false);
      setWebGlSupported(true);
    } catch {
      setWebGlSupported(false);
      return;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(
      activePass === 'depth' ? 0x000000 : activePass === 'normal' ? 0x8080ff : 0x070a12,
    );

    // Subject Meshes
    subjects.forEach((subj) => {
      const geom = new THREE.BoxGeometry(subj.scale.x, subj.scale.y, subj.scale.z);
      let mat: THREE.Material;

      if (activePass === 'depth') {
        mat = new THREE.MeshDepthMaterial();
      } else if (activePass === 'normal') {
        mat = new THREE.MeshNormalMaterial();
      } else if (activePass === 'wireframe') {
        mat = new THREE.MeshBasicMaterial({ wireframe: true, color: 0x38bdf8 });
      } else {
        mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(subj.color || '#a855f7'),
          roughness: 0.35,
          metalness: 0.15,
        });
      }

      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(subj.position.x, subj.position.y, subj.position.z);
      scene.add(mesh);
    });

    if (activePass === 'staging') {
      // Cine Floor Grid
      const grid = new THREE.GridHelper(12, 24, 0x38bdf8, 0x1e293b);
      scene.add(grid);

      // Trajectory Spline Curve
      const curvePoints = waypoints.map(
        (wp) => new THREE.Vector3(wp.position.x, wp.position.y, wp.position.z),
      );
      const curveGeom = new THREE.BufferGeometry().setFromPoints(curvePoints);
      const curveMat = new THREE.LineBasicMaterial({
        color: 0x06b6d4,
        linewidth: 2,
      });
      const curveLine = new THREE.Line(curveGeom, curveMat);
      scene.add(curveLine);

      // Camera Frustum Visualizer Pyramid
      const frustumDistance = Math.min(transform.focalDistanceMeters, 4.0);
      const vFovRad = (transform.fov * Math.PI) / 180;
      const hHeight = Math.tan(vFovRad / 2) * frustumDistance;
      const hWidth = hHeight * (16 / 9);

      const frustumGeom = new THREE.BufferGeometry();
      const frustumVertices = new Float32Array([
        // Origin to 4 corners
        0,
        0,
        0,
        -hWidth,
        hHeight,
        -frustumDistance,
        0,
        0,
        0,
        hWidth,
        hHeight,
        -frustumDistance,
        0,
        0,
        0,
        hWidth,
        -hHeight,
        -frustumDistance,
        0,
        0,
        0,
        -hWidth,
        -hHeight,
        -frustumDistance,
        // Rectangle base
        -hWidth,
        hHeight,
        -frustumDistance,
        hWidth,
        hHeight,
        -frustumDistance,
        hWidth,
        hHeight,
        -frustumDistance,
        hWidth,
        -hHeight,
        -frustumDistance,
        hWidth,
        -hHeight,
        -frustumDistance,
        -hWidth,
        -hHeight,
        -frustumDistance,
        -hWidth,
        -hHeight,
        -frustumDistance,
        -hWidth,
        hHeight,
        -frustumDistance,
      ]);
      frustumGeom.setAttribute('position', new THREE.BufferAttribute(frustumVertices, 3));
      const frustumMat = new THREE.LineBasicMaterial({ color: 0xf59e0b });
      const frustumLines = new THREE.LineSegments(frustumGeom, frustumMat);

      // Camera Object Group
      const camGroup = new THREE.Group();
      camGroup.position.set(transform.position.x, transform.position.y, transform.position.z);
      camGroup.lookAt(transform.target.x, transform.target.y, transform.target.z);
      if (transform.rollAngleDegrees) {
        camGroup.rotateZ((transform.rollAngleDegrees * Math.PI) / 180);
      }

      // Camera Body Mesh
      const bodyGeom = new THREE.BoxGeometry(0.35, 0.25, 0.45);
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 });
      const bodyMesh = new THREE.Mesh(bodyGeom, bodyMat);
      bodyMesh.position.set(0, 0, 0.22);
      camGroup.add(bodyMesh);

      // Lens Cylinder
      const lensGeom = new THREE.CylinderGeometry(0.12, 0.12, 0.2, 16);
      lensGeom.rotateX(Math.PI / 2);
      const lensMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9 });
      const lensMesh = new THREE.Mesh(lensGeom, lensMat);
      lensMesh.position.set(0, 0, -0.1);
      camGroup.add(lensMesh);

      camGroup.add(frustumLines);
      scene.add(camGroup);

      // Depth of Field Focus Plane visualization
      const dofPlaneGeom = new THREE.PlaneGeometry(hWidth * 2.5, hHeight * 2.5);
      const dofPlaneMat = new THREE.MeshBasicMaterial({
        color: 0x10b981,
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide,
      });
      const dofPlane = new THREE.Mesh(dofPlaneGeom, dofPlaneMat);
      dofPlane.position.set(transform.target.x, transform.target.y, transform.target.z);
      dofPlane.lookAt(transform.position.x, transform.position.y, transform.position.z);
      scene.add(dofPlane);

      // Lighting for staging view
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
      const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
      keyLight.position.set(6, 10, 6);
      scene.add(ambientLight, keyLight);

      // Exterior Staging Observer Camera controlled by orbit angles
      const aspect = (canvas.clientWidth || 640) / (canvas.clientHeight || 360);
      const observerCam = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
      const { theta, phi, radius } = stagingOrbitRef.current;
      observerCam.position.set(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta),
      );
      observerCam.lookAt(0, 1.1, 0);

      renderer.render(scene, observerCam);
    } else {
      // Director Viewfinder / Depth / Normal / Wireframe (Through the lens)
      const aspect = (canvas.clientWidth || 640) / (canvas.clientHeight || 360);
      const directorCam = new THREE.PerspectiveCamera(transform.fov, aspect, 0.1, 100);
      directorCam.position.set(transform.position.x, transform.position.y, transform.position.z);
      directorCam.lookAt(transform.target.x, transform.target.y, transform.target.z);
      if (transform.rollAngleDegrees) {
        directorCam.rotation.z += (transform.rollAngleDegrees * Math.PI) / 180;
      }

      if (activePass !== 'depth' && activePass !== 'normal') {
        const ambient = new THREE.AmbientLight(0xffffff, 0.75);
        const dir = new THREE.DirectionalLight(0xffffff, 1.5);
        dir.position.set(4, 7, 5);
        scene.add(ambient, dir);
      }

      renderer.render(scene, directorCam);
    }

    return () => {
      renderer?.dispose();
    };
  }, [rig, progress, activePass, transform, waypoints, subjects]);

  // Handle Mouse Drag for Orbiting Exterior View
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastMousePosRef.current.x;
    const dy = e.clientY - lastMousePosRef.current.y;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };

    stagingOrbitRef.current.theta += dx * 0.008;
    stagingOrbitRef.current.phi = Math.max(
      0.15,
      Math.min(Math.PI / 2 - 0.05, stagingOrbitRef.current.phi - dy * 0.008),
    );
    setProgress((p) => p); // Trigger re-render
  }, []);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    stagingOrbitRef.current.radius = Math.max(
      3.0,
      Math.min(18.0, stagingOrbitRef.current.radius + e.deltaY * 0.01),
    );
    setProgress((p) => p);
  }, []);

  // Export current pass as map
  const handleCapturePass = async (passToCapture: SpatialStagingPass) => {
    setIsExporting(true);
    try {
      const rendered = await renderSpatialPass({
        rig,
        pass: passToCapture,
        progress,
        width: 1280,
        height: 720,
        subjects,
      });
      setLastExport(rendered);
      onExportMap?.(rendered);
    } finally {
      setIsExporting(false);
    }
  };

  const handleAddToReferences = () => {
    if (!lastExport) return;
    const name = `3D_${lastExport.pass.toUpperCase()}_${rig.lens}_${rig.trajectory}`;
    onAddReferenceImage?.(lastExport.dataUrl, name);
  };

  const handleDownload = () => {
    if (!lastExport) return;
    exportSpatialMapAsFile(lastExport, `spatial-${lastExport.pass}-${rig.lens}-${Date.now()}.png`);
  };

  return (
    <div
      ref={containerRef}
      className={`flex flex-col rounded-xl border border-border/80 bg-slate-950/90 text-slate-100 shadow-md overflow-hidden ${className}`}
    >
      {/* Top Control Bar: Mode Tabs & Info */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 bg-slate-900/70 px-3 py-2 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-primary flex items-center gap-1">
            <Icon name="video" className="text-sm" />
            3D Staging Viewport
          </span>
          <span className="text-slate-400">|</span>
          <span className="font-mono text-[11px] text-cyan-400">
            {transform.focalLengthMm}mm (FOV {transform.fov.toFixed(1)}°)
          </span>
          <span className="text-slate-400">|</span>
          <span className="font-mono text-[11px] text-emerald-400">
            {rig.aperture} (DOF {transform.dofNearMeters}m – {transform.dofFarMeters}m)
          </span>
        </div>

        {/* View Pass Selector */}
        <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/50">
          {(
            [
              { id: 'staging', label: '3D Scene' },
              { id: 'viewfinder', label: 'Through Lens' },
              { id: 'depth', label: 'Depth Map' },
              { id: 'normal', label: 'Normal Map' },
              { id: 'wireframe', label: 'Wireframe' },
            ] as const
          ).map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => setActivePass(mode.id)}
              className={`px-2 py-0.5 rounded-md font-medium text-[11px] transition-all ${
                activePass === mode.id
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main 3D Canvas Viewport */}
      <div
        className="relative aspect-video w-full overflow-hidden bg-black select-none cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full block"
          style={{ display: webGlSupported ? 'block' : 'none' }}
        />

        {/* Fallback Viewport for Environments Without WebGL */}
        {!webGlSupported && (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-slate-950 text-slate-400 space-y-2">
            <Icon name="video" className="text-3xl text-cyan-400 opacity-60" />
            <div className="text-xs font-medium text-slate-200">
              3D Spatial Viewport Preview ({activePass.toUpperCase()})
            </div>
            <p className="text-[11px] max-w-sm text-slate-400">
              Camera: {transform.focalLengthMm}mm ({rig.lens}) at {transform.position.z.toFixed(1)}
              m. Trajectory: {rig.trajectory} ({Math.round(progress * 100)}%).
            </p>
          </div>
        )}

        {/* Overlaid HUD Metrics */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 pointer-events-none">
          <div className="inline-flex items-center gap-1.5 rounded-md bg-slate-900/80 backdrop-blur-xs px-2 py-1 text-[11px] font-mono text-cyan-300 border border-slate-700/50 shadow-xs">
            <span>POS:</span>
            <span>
              [{transform.position.x.toFixed(1)}, {transform.position.y.toFixed(1)},{' '}
              {transform.position.z.toFixed(1)}]m
            </span>
          </div>
          {transform.rollAngleDegrees !== 0 && (
            <div className="inline-flex items-center gap-1 rounded-md bg-slate-900/80 backdrop-blur-xs px-2 py-0.5 text-[10px] font-mono text-amber-300 border border-slate-700/50">
              <span>ROLL:</span>
              <span>{transform.rollAngleDegrees}°</span>
            </div>
          )}
        </div>

        <div className="absolute top-2.5 right-2.5 pointer-events-none">
          <span className="rounded-md bg-slate-900/80 backdrop-blur-xs px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-300 border border-slate-700/50">
            {activePass === 'staging' ? 'Exterior Orbit' : 'Director Lens'}
          </span>
        </div>

        {/* Live Subject Badges on Staging View */}
        {activePass === 'staging' && (
          <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 pointer-events-none">
            <span className="rounded bg-cyan-950/80 px-1.5 py-0.5 text-[10px] font-mono text-cyan-300 border border-cyan-700/40">
              FG: {rig.spatialGrid.foregroundSubject || 'Actor'}
            </span>
            <span className="rounded bg-purple-950/80 px-1.5 py-0.5 text-[10px] font-mono text-purple-300 border border-purple-700/40">
              MG: {rig.spatialGrid.midgroundSubject || 'Target'}
            </span>
            <span className="rounded bg-slate-900/80 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 border border-slate-700/40">
              BG: {rig.spatialGrid.backgroundEnvironment || 'Env'}
            </span>
          </div>
        )}
      </div>

      {/* Trajectory Scrubber & Transport */}
      <div className="flex flex-col gap-2 p-3 bg-slate-900/60 border-t border-border/50">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
            title={isPlaying ? 'Pause trajectory animation' : 'Play trajectory animation'}
          >
            <Icon name={isPlaying ? 'pause' : 'play'} className="text-xs" />
          </button>

          <div className="flex-1 space-y-1">
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>START (0%)</span>
              <span className="text-primary font-semibold">
                TRAJECTORY: {rig.trajectory.toUpperCase()} ({Math.round(progress * 100)}%)
              </span>
              <span>END (100%)</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={progress}
              onChange={(e) => {
                setProgress(parseFloat(e.target.value));
                if (isPlaying) setIsPlaying(false);
              }}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>
        </div>

        {/* Generative Capture & ControlNet Reference Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/60 text-xs">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={isExporting}
              onClick={() => handleCapturePass('depth')}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 transition-colors"
              title="Render Depth Map for ControlNet or image conditioning"
            >
              <Icon name="layers" className="text-xs text-cyan-400" />
              Capture Depth Map
            </button>

            <button
              type="button"
              disabled={isExporting}
              onClick={() => handleCapturePass('normal')}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 transition-colors"
              title="Render Surface Normal Map for ControlNet"
            >
              <Icon name="sparkles" className="text-xs text-purple-400" />
              Capture Normal Map
            </button>

            <button
              type="button"
              disabled={isExporting}
              onClick={() => handleCapturePass('wireframe')}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 transition-colors"
              title="Render Wireframe Map"
            >
              <Icon name="grid-3x3" className="text-xs text-emerald-400" />
              Capture Wireframe
            </button>
          </div>

          {lastExport && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400">
                Ready: <b className="text-slate-200">{lastExport.pass.toUpperCase()}</b>
              </span>
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px]"
                title="Download PNG file"
              >
                <Icon name="download" className="text-xs" />
                Download
              </button>
              {onAddReferenceImage && (
                <button
                  type="button"
                  onClick={handleAddToReferences}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-primary text-primary-foreground font-medium text-[11px] shadow-xs hover:bg-primary/90"
                  title="Add as reference image in Prompt Studio"
                >
                  <Icon name="plus" className="text-xs" />
                  Use as Reference
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
