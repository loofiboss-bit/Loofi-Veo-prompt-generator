import React, { useMemo } from 'react';
import type {
  SpatialCameraRig,
  CameraLensType,
  CameraTrajectory,
  CameraAperture,
  CameraHeightLevel,
  CameraMovementSpeed,
} from '@core/types/spatialCamera';
import type { IconName } from '@core/types';
import {
  compileSpatialCameraRig,
  DEFAULT_SPATIAL_CAMERA_RIG,
} from '@core/services/spatialCameraService';
import Icon from '@shared/components/ui/Icon';

interface SpatialCameraDirectorProps {
  rig?: SpatialCameraRig;
  onChange: (updated: SpatialCameraRig) => void;
  disabled?: boolean;
}

const LENS_OPTIONS: Array<{ id: CameraLensType; label: string; tag: string }> = [
  { id: '16mm-ultra-wide', label: '16mm', tag: 'Ultra-Wide' },
  { id: '24mm-wide', label: '24mm', tag: 'Wide' },
  { id: '35mm-cinematic', label: '35mm', tag: 'Cinema' },
  { id: '50mm-natural', label: '50mm', tag: 'Natural' },
  { id: '85mm-portrait', label: '85mm', tag: 'Portrait' },
  { id: '135mm-telephoto', label: '135mm', tag: 'Telephoto' },
  { id: 'anamorphic-2.39', label: '2.39:1', tag: 'Anamorphic' },
];

const APERTURE_OPTIONS: CameraAperture[] = ['f/1.2', 'f/1.8', 'f/2.8', 'f/4', 'f/8', 'f/16'];

const HEIGHT_OPTIONS: Array<{ id: CameraHeightLevel; label: string; icon: IconName }> = [
  { id: 'ground-level', label: 'Ground', icon: 'chevron-down' },
  { id: 'knee-level', label: 'Low', icon: 'arrow-left' },
  { id: 'eye-level', label: 'Eye Level', icon: 'eye' },
  { id: 'high-angle', label: 'High', icon: 'arrow-up-right' },
  { id: 'birds-eye', label: 'Overhead', icon: 'arrow-right' },
  { id: 'aerial-drone', label: 'Drone', icon: 'video' },
];

const TRAJECTORY_OPTIONS: Array<{ id: CameraTrajectory; label: string; icon: IconName }> = [
  { id: 'static', label: 'Locked Static', icon: 'video' },
  { id: 'push-in', label: 'Dolly Push-in', icon: 'expand' },
  { id: 'pull-out', label: 'Dolly Pull-out', icon: 'expand' },
  { id: 'pan-left', label: 'Pan Left', icon: 'arrow-left' },
  { id: 'pan-right', label: 'Pan Right', icon: 'arrow-right' },
  { id: 'tilt-up', label: 'Tilt Up', icon: 'arrow-up-right' },
  { id: 'tilt-down', label: 'Tilt Down', icon: 'chevron-down' },
  { id: 'crane-up', label: 'Crane Ascension', icon: 'arrow-up-right' },
  { id: 'orbit-clockwise', label: 'Orbit 360°', icon: 'sparkles' },
  { id: 'dolly-zoom-vertigo', label: 'Vertigo Zoom', icon: 'zap' },
  { id: 'fpv-drone-dive', label: 'FPV Dive', icon: 'activity' },
  { id: 'dutch-angle-tracking', label: 'Dutch Track', icon: 'move' },
  { id: 'steadicam-follow', label: 'Steadicam Follow', icon: 'user' },
];

const SPEED_OPTIONS: Array<{ id: CameraMovementSpeed; label: string }> = [
  { id: 'slow-subtle', label: 'Slow & Subtle' },
  { id: 'smooth-cinematic', label: 'Smooth Cinematic' },
  { id: 'rapid-dynamic', label: 'Rapid Dynamic' },
  { id: 'whip-pan', label: 'Whip Speed' },
];

export const SpatialCameraDirector: React.FC<SpatialCameraDirectorProps> = ({
  rig = DEFAULT_SPATIAL_CAMERA_RIG,
  onChange,
  disabled = false,
}) => {
  const compiled = useMemo(() => compileSpatialCameraRig(rig), [rig]);

  const handleUpdate = (patch: Partial<SpatialCameraRig>) => {
    onChange({
      ...rig,
      ...patch,
      spatialGrid: {
        ...rig.spatialGrid,
        ...(patch.spatialGrid || {}),
      },
    });
  };

  return (
    <div className="space-y-4 rounded-xl border border-border/70 bg-card/60 p-4 text-card-foreground shadow-sm">
      <div className="flex items-center justify-between border-b border-border/40 pb-3">
        <div className="flex items-center gap-2">
          <Icon name="film" className="text-primary text-xl" />
          <div>
            <h4 className="text-sm font-semibold tracking-tight">3D Spatial Camera Director</h4>
            <p className="text-xs text-muted-foreground">
              Direct focal length, trajectory, and spatial staging for Veo 3.1
            </p>
          </div>
        </div>
        <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          Veo 3.1 Rig
        </span>
      </div>

      {/* Lens Selection */}
      <div className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Icon name="video" className="text-sm" />
          Lens & Focal Length
        </span>
        <div className="grid grid-cols-3 sm:grid-cols-7 gap-1.5">
          {LENS_OPTIONS.map((lens) => (
            <button
              key={lens.id}
              type="button"
              disabled={disabled}
              onClick={() => handleUpdate({ lens: lens.id })}
              className={`flex flex-col items-center justify-center rounded-lg border p-1.5 text-center transition-all ${
                rig.lens === lens.id
                  ? 'border-primary bg-primary/10 text-primary shadow-xs font-semibold'
                  : 'border-border/60 bg-background/50 hover:bg-accent/40 text-foreground/80'
              }`}
            >
              <span className="text-xs">{lens.label}</span>
              <span className="text-[10px] text-muted-foreground opacity-80">{lens.tag}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Aperture & Height */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Aperture */}
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Icon name="sparkles" className="text-sm" />
            Aperture & Depth of Field
          </span>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1">
            {APERTURE_OPTIONS.map((ap) => (
              <button
                key={ap}
                type="button"
                disabled={disabled}
                onClick={() => handleUpdate({ aperture: ap })}
                className={`rounded-md border py-1 text-center text-xs transition-all ${
                  rig.aperture === ap
                    ? 'border-primary bg-primary/10 text-primary font-medium'
                    : 'border-border/60 bg-background/50 hover:bg-accent/40 text-foreground/80'
                }`}
              >
                {ap}
              </button>
            ))}
          </div>
        </div>

        {/* Camera Height */}
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Icon name="move" className="text-sm" />
            Camera Height Level
          </span>
          <div className="grid grid-cols-3 gap-1">
            {HEIGHT_OPTIONS.map((ht) => (
              <button
                key={ht.id}
                type="button"
                disabled={disabled}
                onClick={() => handleUpdate({ heightLevel: ht.id })}
                className={`flex items-center justify-center gap-1 rounded-md border py-1 text-xs transition-all ${
                  rig.heightLevel === ht.id
                    ? 'border-primary bg-primary/10 text-primary font-medium'
                    : 'border-border/60 bg-background/50 hover:bg-accent/40 text-foreground/80'
                }`}
              >
                <Icon name={ht.icon} className="text-xs" />
                <span className="truncate">{ht.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Trajectory & Speed */}
      <div className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Icon name="video" className="text-sm" />
          Camera Trajectory
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {TRAJECTORY_OPTIONS.map((tr) => (
            <button
              key={tr.id}
              type="button"
              disabled={disabled}
              onClick={() => handleUpdate({ trajectory: tr.id })}
              className={`flex items-center gap-1.5 rounded-lg border p-1.5 text-left text-xs transition-all ${
                rig.trajectory === tr.id
                  ? 'border-primary bg-primary/10 text-primary font-medium shadow-xs'
                  : 'border-border/60 bg-background/50 hover:bg-accent/40 text-foreground/80'
              }`}
            >
              <Icon name={tr.icon} className="text-sm shrink-0" />
              <span className="truncate">{tr.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Speed & Roll */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Icon name="activity" className="text-sm" />
            Movement Speed
          </span>
          <div className="grid grid-cols-2 gap-1">
            {SPEED_OPTIONS.map((spd) => (
              <button
                key={spd.id}
                type="button"
                disabled={disabled}
                onClick={() => handleUpdate({ trajectorySpeed: spd.id })}
                className={`rounded-md border py-1 text-center text-xs transition-all ${
                  rig.trajectorySpeed === spd.id
                    ? 'border-primary bg-primary/10 text-primary font-medium'
                    : 'border-border/60 bg-background/50 hover:bg-accent/40 text-foreground/80'
                }`}
              >
                {spd.label}
              </button>
            ))}
          </div>
        </div>

        {/* Spatial Depth Staging */}
        <div className="space-y-1.5">
          <label
            htmlFor="foreground-subject-input"
            className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"
          >
            <Icon name="layers" className="text-sm" />
            Foreground Subject (Optional)
          </label>
          <input
            id="foreground-subject-input"
            type="text"
            disabled={disabled}
            value={rig.spatialGrid.foregroundSubject || ''}
            onChange={(e) =>
              handleUpdate({
                spatialGrid: { foregroundSubject: e.target.value },
              })
            }
            placeholder="e.g. Hero character in foreground left"
            className="w-full rounded-md border border-border/60 bg-background/60 px-2.5 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {/* Live Compiled Directive Badge */}
      <div className="rounded-lg bg-muted/50 p-2.5 text-xs">
        <span className="font-semibold text-foreground/90 block mb-1">
          Compiled Veo Camera Rig:
        </span>
        <code className="text-primary font-mono text-[11px] break-words">
          {compiled.promptFragment}
        </code>
      </div>
    </div>
  );
};
