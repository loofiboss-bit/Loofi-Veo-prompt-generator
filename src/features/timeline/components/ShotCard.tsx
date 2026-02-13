/**
 * ShotCard — Memoized shot row component for StoryBoard.
 * Extracted from StoryBoard.tsx to avoid re-rendering every shot
 * when only one changes.
 * v1.6.0 — Performance & Stability
 */

import React from 'react';
import Icon from '@shared/components/ui/Icon';
import TextAreaInput from '@shared/components/ui/TextAreaInput';
import SelectInput from '@shared/components/ui/SelectInput';
import type { Shot, CharacterProfile } from '@core/types';

interface ShotCardProps {
  shot: Shot;
  index: number;
  isSelected: boolean;
  isUpscaling: boolean;
  isColorMatching: boolean;
  colorMatchTargetId: number | null;
  savedCharacters: CharacterProfile[];
  t: Record<string, string>;
  onShotChange: (id: number, field: keyof Shot, value: string | number | boolean | null) => void;
  onDelete: (id: number) => void;
  onSelectionToggle: (id: number) => void;
  onWhiteboard: (id: number) => void;
  onCameraPlotter: (id: number) => void;
  onPoseEditor: (id: number) => void;
  onFoley: (id: number) => void;
  onMagicMask: (id: number) => void;
  onMotionEditor: (id: number) => void;
  onDubbing: (id: number) => void;
  onUpscale: (shot: Shot) => void;
  onColorMatch: (id: number) => void;
  onColorMatchTarget: (id: number | null) => void;
  onRecording: (id: number) => void;
}

const ShotCard: React.FC<ShotCardProps> = React.memo(
  ({
    shot,
    index,
    isSelected,
    isUpscaling: isUpscalingShot,
    isColorMatching,
    colorMatchTargetId,
    savedCharacters,
    t,
    onShotChange,
    onDelete,
    onSelectionToggle,
    onWhiteboard,
    onCameraPlotter,
    onPoseEditor,
    onFoley,
    onMagicMask,
    onMotionEditor,
    onDubbing,
    onUpscale,
    onColorMatch,
    onColorMatchTarget,
    onRecording,
  }) => (
    <div
      className={`bg-slate-900 border ${isSelected ? 'border-cyan-500 ring-1 ring-cyan-500/50' : 'border-slate-800'} rounded-xl p-4 flex gap-4 transition-all hover:border-slate-600`}
    >
      {/* Shot Header / ID */}
      <div className="flex flex-col items-center gap-2 border-r border-slate-800 pr-4">
        <span className="text-xl font-bold text-slate-500">#{index + 1}</span>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelectionToggle(shot.id)}
          className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-cyan-600 focus:ring-cyan-500"
          aria-label={`Select shot ${index + 1}`}
        />
        <button
          onClick={() => onDelete(shot.id)}
          className="text-slate-600 hover:text-red-400 mt-2"
          title="Delete Shot"
          aria-label="Delete Shot"
        >
          <Icon name="trash" className="w-5 h-5" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Visual Preview */}
        <div className="bg-black rounded-lg aspect-video flex items-center justify-center relative overflow-hidden group">
          {shot.generatedVideoUrl ? (
            <video
              src={shot.generatedVideoUrl}
              className="w-full h-full object-contain"
              muted
              loop
              onMouseOver={(e) => e.currentTarget.play()}
              onMouseOut={(e) => e.currentTarget.pause()}
            />
          ) : shot.conceptImageUrl ? (
            <img
              src={shot.conceptImageUrl}
              className="w-full h-full object-cover opacity-80"
              alt="Concept"
            />
          ) : (
            <div className="text-center text-slate-600">
              <Icon name="image" className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <span className="text-xs">No visual</span>
            </div>
          )}

          {/* 4K Badge */}
          {shot.is4K && (
            <div className="absolute top-2 left-2 bg-yellow-500/90 text-black text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm z-10 pointer-events-none">
              4K
            </div>
          )}

          {/* Visual Tools Overlay */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-sm">
            <button
              onClick={() => onWhiteboard(shot.id)}
              className="p-2 bg-slate-700 hover:bg-slate-600 rounded-full text-white"
              title="Sketch"
              aria-label="Sketch"
            >
              <Icon name="pencil" className="w-4 h-4" />
            </button>
            <button
              onClick={() => onCameraPlotter(shot.id)}
              className="p-2 bg-slate-700 hover:bg-slate-600 rounded-full text-white"
              title="Camera Plot"
              aria-label="Camera Plot"
            >
              <Icon name="video" className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPoseEditor(shot.id)}
              className="p-2 bg-slate-700 hover:bg-slate-600 rounded-full text-white"
              title="Pose"
              aria-label="Pose"
            >
              <Icon name="accessibility" className="w-4 h-4" />
            </button>

            {/* SFX Button */}
            {shot.generatedVideoUrl && (
              <button
                onClick={() => onFoley(shot.id)}
                className="p-2 bg-yellow-700 hover:bg-yellow-600 rounded-full text-white shadow-lg"
                title="Auto-Foley (SFX)"
                aria-label="Auto-Foley (SFX)"
              >
                <Icon name="audio" className="w-4 h-4" />
              </button>
            )}

            {/* Magic Mask Button */}
            {shot.generatedVideoUrl && (
              <button
                onClick={() => onMagicMask(shot.id)}
                className="p-2 bg-fuchsia-700 hover:bg-fuchsia-600 rounded-full text-white shadow-lg"
                title="Magic Mask (Roto)"
                aria-label="Magic Mask (Roto)"
              >
                <Icon name="magic" className="w-4 h-4" />
              </button>
            )}

            {/* Motion Editor (Ken Burns) for Images OR Videos */}
            {(shot.conceptImageUrl || shot.generatedVideoUrl) && (
              <button
                onClick={() => onMotionEditor(shot.id)}
                className="p-2 bg-slate-700 hover:bg-slate-600 rounded-full text-white"
                title="Motion (Ken Burns)"
                aria-label="Motion (Ken Burns)"
              >
                <Icon name="move" className="w-4 h-4" />
              </button>
            )}
            {shot.generatedVideoUrl && shot.dialogueText && (
              <button
                onClick={() => onDubbing(shot.id)}
                className="p-2 bg-emerald-700 hover:bg-emerald-600 rounded-full text-white"
                title="Global Dub (Translate & Sync)"
                aria-label="Global Dub (Translate & Sync)"
              >
                <Icon name="globe" className="w-4 h-4" />
              </button>
            )}
            {shot.generatedVideoUrl && !shot.is4K && !isUpscalingShot && (
              <button
                onClick={() => onUpscale(shot)}
                className="p-2 bg-fuchsia-700 hover:bg-fuchsia-600 rounded-full text-white shadow-lg shadow-fuchsia-500/20"
                title="Upscale to 4K (5 Credits)"
                aria-label="Upscale to 4K (5 Credits)"
              >
                <Icon name="sparkles" className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Text Inputs */}
        <div className="space-y-4">
          <TextAreaInput
            label={t.actionLabel}
            name={`action-${shot.id}`}
            value={shot.action}
            onChange={(e) => onShotChange(shot.id, 'action', e.target.value)}
            placeholder={t.actionPlaceholder}
            rows={3}
          />
          <div className="relative">
            <TextAreaInput
              label="Dialogue"
              name={`dialogue-${shot.id}`}
              value={shot.dialogueText || ''}
              onChange={(e) => onShotChange(shot.id, 'dialogueText', e.target.value)}
              placeholder="Spoken lines..."
              rows={2}
            />
            <button
              onClick={() => onRecording(shot.id)}
              className="absolute top-0 right-0 mt-8 mr-2 text-slate-400 hover:text-red-400"
              title="Record Audio"
              aria-label="Record Audio"
            >
              <Icon name="audio" className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Config */}
        <div className="space-y-4">
          <SelectInput
            label="Shot Type"
            name={`type-${shot.id}`}
            value={shot.camera}
            onChange={(e) => onShotChange(shot.id, 'camera', e.target.value)}
            options={[
              { value: 'Wide Shot', label: 'Wide Shot' },
              { value: 'Medium Shot', label: 'Medium Shot' },
              { value: 'Close-up', label: 'Close-up' },
              { value: 'Extreme Close-up', label: 'Extreme Close-up' },
              { value: 'Tracking Shot', label: 'Tracking Shot' },
              { value: 'Drone Shot', label: 'Drone Shot' },
            ]}
          />
          <SelectInput
            label="Character"
            name={`char-${shot.id}`}
            value={shot.characterId || ''}
            onChange={(e) => onShotChange(shot.id, 'characterId', e.target.value)}
            options={[
              { value: '', label: 'None / Generic' },
              ...savedCharacters.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
          {colorMatchTargetId === null ? (
            <button
              onClick={() => onColorMatchTarget(shot.id)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg text-xs border border-slate-700 transition-colors"
            >
              Match Color to this Shot
            </button>
          ) : colorMatchTargetId === shot.id ? (
            <button
              onClick={() => onColorMatchTarget(null)}
              className="w-full py-2 bg-yellow-900/30 text-yellow-400 border border-yellow-500/50 rounded-lg text-xs animate-pulse"
            >
              Select Reference Shot...
            </button>
          ) : (
            <button
              onClick={() => onColorMatch(shot.id)}
              disabled={isColorMatching}
              className="w-full py-2 bg-green-900/30 text-green-400 border border-green-500/50 rounded-lg text-xs hover:bg-green-800/50 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isColorMatching ? 'Applying Color...' : 'Apply Color from Here'}
            </button>
          )}
        </div>
      </div>
    </div>
  ),
);

ShotCard.displayName = 'ShotCard';

export { ShotCard };
