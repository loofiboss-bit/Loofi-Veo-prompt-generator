import React, { useState, useRef, useEffect } from 'react';
import Icon from '@shared/components/ui/Icon';
import { Shot, MotionConfig, MotionKeyframe } from '@core/types';
import RangeInput from '@shared/components/ui/RangeInput';
import SelectInput from '@shared/components/ui/SelectInput';

interface MotionEditorPanelProps {
  shot: Shot;
  onSave: (config: MotionConfig) => void;
  onClose: () => void;
}

const DEFAULT_KEYFRAME: MotionKeyframe = { x: 0.5, y: 0.5, zoom: 1.0 };

const EASING_OPTIONS = [
  { value: 'linear', label: 'Linear' },
  { value: 'ease-in', label: 'Ease In' },
  { value: 'ease-out', label: 'Ease Out' },
  { value: 'ease-in-out', label: 'Smooth (Ease In/Out)' },
];

const ViewportVisualizer: React.FC<{
  label: string;
  imageUrl: string;
  keyframe: MotionKeyframe;
  onChange: (k: MotionKeyframe) => void;
}> = ({ label, imageUrl, keyframe, onChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();

    // Calculate viewport dimensions relative to container
    // Viewport width = 100% / zoom
    const viewportW = rect.width / keyframe.zoom;
    const viewportH = rect.height / keyframe.zoom;

    // Boundaries for Center X/Y
    // Max X center = 1.0 - (viewportW_percent / 2)
    // Min X center = 0.0 + (viewportW_percent / 2)
    const halfWPercent = 1 / keyframe.zoom / 2;
    const halfHPercent = 1 / keyframe.zoom / 2;

    const minX = halfWPercent;
    const maxX = 1 - halfWPercent;
    const minY = halfHPercent;
    const maxY = 1 - halfHPercent;

    // Mouse pos relative to container (0-1)
    let x = (e.clientX - rect.left) / rect.width;
    let y = (e.clientY - rect.top) / rect.height;

    // Clamp
    x = Math.max(minX, Math.min(maxX, x));
    y = Math.max(minY, Math.min(maxY, y));

    onChange({ ...keyframe, x, y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</span>
        <span className="text-[10px] font-mono text-cyan-400 bg-cyan-900/30 px-2 py-0.5 rounded">
          {keyframe.zoom.toFixed(1)}x
        </span>
      </div>

      {/* Visualizer */}
      <div
        ref={containerRef}
        className="relative aspect-video bg-slate-950 rounded-lg overflow-hidden border border-slate-700 cursor-crosshair select-none group"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Background Image */}
        <img
          src={imageUrl}
          className="w-full h-full object-cover opacity-60 pointer-events-none"
          alt="Reference"
        />

        {/* Viewport Box */}
        <div
          className="absolute border-2 border-fuchsia-500 shadow-[0_0_15px_rgba(217,70,239,0.3)] pointer-events-none transition-all duration-75"
          style={{
            width: `${100 / keyframe.zoom}%`,
            height: `${100 / keyframe.zoom}%`,
            left: `${keyframe.x * 100}%`,
            top: `${keyframe.y * 100}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {/* Crosshair */}
          <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-fuchsia-500 rounded-full -translate-x-1/2 -translate-y-1/2" />

          {/* Clear view inside box */}
          <div className="absolute inset-0 overflow-hidden">
            <img
              src={imageUrl}
              className="absolute object-cover w-full h-full max-w-none"
              style={{
                width: `${keyframe.zoom * 100}%`,
                height: `${keyframe.zoom * 100}%`,
                left: `${50}%`,
                top: `${50}%`,
                transform: `translate(-${keyframe.x * 100}%, -${keyframe.y * 100}%) scale(1)`, // Complex inverse transform logic simplified by just using container relative math
              }}
              // Note: CSS masking approach above is tricky. Simpler visual approach:
              // Just show border box.
              alt=""
            />
          </div>
        </div>
      </div>

      {/* Slider Controls */}
      <RangeInput
        label="Zoom Level"
        name="zoom"
        value={keyframe.zoom * 10}
        onChange={(e) => onChange({ ...keyframe, zoom: parseInt(e.target.value) / 10 })}
        min={10}
        max={50}
      />
    </div>
  );
};

const MotionEditorPanel: React.FC<MotionEditorPanelProps> = ({ shot, onSave, onClose }) => {
  const [config, setConfig] = useState<MotionConfig>(
    shot.motionConfig || {
      start: { ...DEFAULT_KEYFRAME },
      end: { ...DEFAULT_KEYFRAME, zoom: 1.2 }, // Slight push-in default
      ease: 'linear',
    },
  );

  const imageUrl = shot.conceptImageUrl || shot.generatedVideoUrl || '';

  const handleSave = () => {
    onSave(config);
    onClose();
  };

  if (!imageUrl) {
    return (
      <div className="bg-slate-900 p-6 rounded-lg text-center border border-slate-700">
        <p className="text-slate-400 text-sm">No visual asset available for motion setup.</p>
        <button onClick={onClose} className="mt-4 px-4 py-2 bg-slate-800 text-white rounded">
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-lg flex items-center justify-center z-[130] p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Icon name="move" className="w-5 h-5 text-fuchsia-400" />
            Motion Keyframes (Ken Burns)
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <Icon name="cancel" className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-grow p-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <ViewportVisualizer
              label="Start Frame (A)"
              imageUrl={imageUrl}
              keyframe={config.start}
              onChange={(k) => setConfig((prev) => ({ ...prev, start: k }))}
            />
            <ViewportVisualizer
              label="End Frame (B)"
              imageUrl={imageUrl}
              keyframe={config.end}
              onChange={(k) => setConfig((prev) => ({ ...prev, end: k }))}
            />
          </div>

          <div className="mt-8 bg-slate-800/30 p-4 rounded-xl border border-slate-700 flex justify-between items-center">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Icon name="activity" className="w-4 h-4" />
              <span>Animation Curve</span>
            </div>
            <div className="w-48">
              <SelectInput
                label=""
                name="easing"
                value={config.ease}
                options={EASING_OPTIONS}
                onChange={(e) => setConfig((prev) => ({ ...prev, ease: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-800/30 flex justify-end gap-3 border-t border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white rounded-lg text-sm font-bold shadow-lg flex items-center gap-2"
          >
            <Icon name="check" className="w-4 h-4" />
            Apply Motion
          </button>
        </div>
      </div>
    </div>
  );
};

export default MotionEditorPanel;
