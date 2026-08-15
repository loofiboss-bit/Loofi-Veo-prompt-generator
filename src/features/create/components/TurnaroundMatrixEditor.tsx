import React from 'react';
import type { ContinuityProfile, ContinuityTurnaroundSheet } from '@core/types/continuity';
import type { IconName } from '@core/types';
import Icon from '@shared/components/ui/Icon';

interface TurnaroundMatrixEditorProps {
  profile: ContinuityProfile;
  onUpdateProfile: (updated: ContinuityProfile) => void;
  disabled?: boolean;
}

const ANGLES: Array<{
  key: keyof ContinuityTurnaroundSheet;
  label: string;
  sublabel: string;
  icon: IconName;
}> = [
  { key: 'frontAssetId', label: 'Front View', sublabel: 'Direct facial identity', icon: 'user' },
  {
    key: 'threeQuarterAssetId',
    label: '3/4 Profile',
    sublabel: 'Three-quarter angle',
    icon: 'eye',
  },
  {
    key: 'profileAssetId',
    label: 'Side Profile',
    sublabel: 'Side silhouette',
    icon: 'arrow-right',
  },
  {
    key: 'actionPoseAssetId',
    label: 'Action / Back',
    sublabel: 'Full posture & costume',
    icon: 'activity',
  },
];

export const TurnaroundMatrixEditor: React.FC<TurnaroundMatrixEditorProps> = ({
  profile,
  onUpdateProfile,
  disabled = false,
}) => {
  const turnaround: ContinuityTurnaroundSheet = profile.turnaroundSheet || {};

  const handleAngleUpdate = (key: keyof ContinuityTurnaroundSheet, assetId: string | undefined) => {
    onUpdateProfile({
      ...profile,
      turnaroundSheet: {
        ...turnaround,
        [key]: assetId,
      },
    });
  };

  return (
    <div className="space-y-3 rounded-xl border border-border/70 bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
        <div className="flex items-center gap-2">
          <Icon name="grid-3x3" className="text-primary text-lg" />
          <div>
            <h4 className="text-sm font-semibold tracking-tight">
              4-Angle Turnaround Reference Matrix
            </h4>
            <p className="text-xs text-muted-foreground">
              Anchor multi-angle consistency for {profile.name} across shots
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground uppercase bg-muted px-2 py-0.5 rounded">
          {profile.kind} profile
        </span>
      </div>

      {/* 4 Quadrants Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {ANGLES.map((angle) => {
          const assetId = turnaround[angle.key];
          return (
            <div
              key={angle.key}
              className="flex flex-col rounded-lg border border-border/60 bg-background/50 p-2.5 space-y-2 text-center items-center justify-between min-h-[140px]"
            >
              <div className="flex items-center gap-1 text-xs font-medium text-foreground">
                <Icon name={angle.icon} className="text-primary text-xs" />
                <span>{angle.label}</span>
              </div>

              {assetId ? (
                <div className="relative aspect-square w-16 overflow-hidden rounded-md border border-primary/40 bg-muted">
                  <span className="text-[10px] text-primary font-mono flex items-center justify-center h-full">
                    Asset #{assetId.slice(0, 6)}
                  </span>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => handleAngleUpdate(angle.key, undefined)}
                    className="absolute top-0.5 right-0.5 rounded bg-black/60 p-0.5 text-white hover:bg-destructive text-[10px]"
                    title="Remove angle reference"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-16 w-16 rounded-md border border-dashed border-border/80 bg-muted/30 text-muted-foreground/60">
                  <Icon name="image" className="text-xl" />
                </div>
              )}

              <p className="text-[10px] text-muted-foreground leading-tight">{angle.sublabel}</p>

              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  const input = prompt(`Enter image Asset ID for ${angle.label}:`);
                  if (input && input.trim()) {
                    handleAngleUpdate(angle.key, input.trim());
                  }
                }}
                className="w-full rounded border border-border/70 bg-card py-1 text-[11px] font-medium text-foreground hover:bg-muted transition-colors"
              >
                {assetId ? 'Change' : 'Assign'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
