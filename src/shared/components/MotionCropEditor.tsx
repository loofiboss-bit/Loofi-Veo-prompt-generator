import React, { useRef, useState, useEffect } from 'react';
import Icon from '@shared/components/ui/Icon';
import { MotionConfig, MotionKeyframe } from '@core/types';

interface MotionCropEditorProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  initialConfig?: MotionConfig;
  onSave: (config: MotionConfig) => void;
}

// Helper: Convert MotionKeyframe (center X/Y, zoom) to Rect (x, y, w, h)
// All normalized 0-1 relative to container
interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const keyframeToRect = (k: MotionKeyframe): Rect => {
  // Zoom = 1 means Width = 1.0 (Full)
  // Zoom = 2 means Width = 0.5 (Half)
  const w = 1 / k.zoom;
  const h = 1 / k.zoom;
  const x = k.x - w / 2;
  const y = k.y - h / 2;
  return { x, y, w, h };
};

const rectToKeyframe = (r: Rect): MotionKeyframe => {
  const zoom = 1 / r.w; // Assuming 1:1 aspect constraint for zoom calculation logic
  const x = r.x + r.w / 2;
  const y = r.y + r.h / 2;
  return { x, y, zoom };
};

const MotionCropEditor: React.FC<MotionCropEditorProps> = ({
  isOpen,
  onClose,
  imageUrl,
  initialConfig,
  onSave,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [startRect, setStartRect] = useState<Rect>({ x: 0, y: 0, w: 1, h: 1 });
  const [endRect, setEndRect] = useState<Rect>({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 });
  const [activeHandle, setActiveHandle] = useState<'start' | 'end' | null>(null);
  const [dragMode, setDragMode] = useState<'move' | 'resize'>('move');
  const [isDragging, setIsDragging] = useState(false);

  // Initialize
  useEffect(() => {
    if (initialConfig) {
      setStartRect(keyframeToRect(initialConfig.start));
      setEndRect(keyframeToRect(initialConfig.end));
    } else {
      // Default: Full frame to slight zoom in
      setStartRect({ x: 0, y: 0, w: 1, h: 1 });
      setEndRect({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 });
    }
  }, [isOpen, initialConfig]);

  const handleMouseDown = (e: React.MouseEvent, type: 'start' | 'end', mode: 'move' | 'resize') => {
    e.stopPropagation();
    setActiveHandle(type);
    setDragMode(mode);
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !activeHandle || !containerRef.current) return;

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();

    // Deltas in %
    const dx = e.movementX / rect.width;
    const dy = e.movementY / rect.height;

    const updateRect = (prev: Rect): Rect => {
      let next = { ...prev };

      if (dragMode === 'move') {
        next.x += dx;
        next.y += dy;
        // Clamp
        next.x = Math.max(0, Math.min(1 - next.w, next.x));
        next.y = Math.max(0, Math.min(1 - next.h, next.y));
      } else {
        // Resize (corner drag logic simplified: scale from center or bottom-right)
        // Assuming resizing reduces width/height evenly (aspect ratio lock for zoom logic)
        const dw = dx;
        // Constraints: Min width 10%, Max width 100%
        const newW = Math.max(0.1, Math.min(1, prev.w + dw));
        const newH = newW; // Lock aspect ratio 1:1 for the crop box relative to itself

        // Adjust position to keep centered or anchored? Let's just expand right/down for simplicity
        next.w = newW;
        next.h = newH;

        // Clamp if expanded beyond container
        if (next.x + next.w > 1) next.w = 1 - next.x;
        if (next.y + next.h > 1) next.h = 1 - next.y;
      }
      return next;
    };

    if (activeHandle === 'start') setStartRect((prev) => updateRect(prev));
    else setEndRect((prev) => updateRect(prev));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setActiveHandle(null);
  };

  const handleSave = () => {
    const config: MotionConfig = {
      start: rectToKeyframe(startRect),
      end: rectToKeyframe(endRect),
      ease: 'linear', // Or add selector
    };
    onSave(config);
    onClose();
  };

  if (!isOpen) return null;

  const renderBox = (rect: Rect, type: 'start' | 'end') => {
    const color = type === 'start' ? 'border-green-500' : 'border-red-500';
    const labelColor = type === 'start' ? 'bg-green-500' : 'bg-red-500';
    const zIndex = type === activeHandle ? 20 : 10;

    return (
      // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
      <div
        className={`absolute border-2 ${color} ${zIndex === 20 ? 'z-20' : 'z-10'} cursor-move`}
        style={{
          left: `${rect.x * 100}%`,
          top: `${rect.y * 100}%`,
          width: `${rect.w * 100}%`,
          height: `${rect.h * 100}%`,
          boxShadow: '0 0 10px rgba(0,0,0,0.5)',
        }}
        onMouseDown={(e) => handleMouseDown(e, type, 'move')}
        role="application"
        aria-label={`${type === 'start' ? 'Start' : 'End'} crop frame`}
        tabIndex={0}
      >
        <div
          className={`absolute top-0 left-0 px-1 text-[10px] text-white font-bold ${labelColor}`}
        >
          {type.toUpperCase()}
        </div>
        {/* Resize Handle */}
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
        <div
          className={`absolute bottom-0 right-0 w-4 h-4 bg-white/50 cursor-se-resize hover:bg-white border ${color}`}
          onMouseDown={(e) => handleMouseDown(e, type, 'resize')}
          role="application"
          tabIndex={0}
        />
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-lg flex items-center justify-center z-[140] p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col h-[90vh] overflow-hidden">
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Icon name="move" className="w-5 h-5 text-fuchsia-400" />
            Ken Burns Editor
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <Icon name="cancel" className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-grow flex items-center justify-center bg-black p-8 overflow-hidden select-none">
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
          <div
            ref={containerRef}
            className="relative aspect-video w-full max-h-full bg-slate-800 shadow-2xl"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            role="application"
            aria-label="Ken Burns cropping area"
            tabIndex={0}
          >
            {/* Background Image */}
            <img
              src={imageUrl}
              alt="Reference"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none opacity-50"
            />

            {/* Crop Boxes */}
            {renderBox(startRect, 'start')}
            {renderBox(endRect, 'end')}
          </div>
        </div>

        <div className="p-4 bg-slate-800/30 flex justify-between items-center border-t border-slate-700">
          <div className="text-xs text-slate-400">
            Drag box to move. Drag corner to resize (Zoom).
          </div>
          <div className="flex gap-3">
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
    </div>
  );
};

export default MotionCropEditor;
