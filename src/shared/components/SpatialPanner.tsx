import React, { useRef, useState, useEffect, useCallback } from 'react';
import Icon from '@shared/components/ui/Icon';

interface SpatialPannerProps {
  x: number; // -1 to 1
  z: number; // -1 to 1 (Front/Back)
  onChange: (x: number, z: number) => void;
  label?: string;
}

const SpatialPanner: React.FC<SpatialPannerProps> = ({
  x,
  z,
  onChange,
  label = 'Spatial Panner',
}) => {
  const containerRef = useRef<HTMLButtonElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const updatePosition = useCallback(
    (clientX: number, clientY: number) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();

    // Calculate relative position (0 to 1)
    let relX = (clientX - rect.left) / rect.width;
    let relY = (clientY - rect.top) / rect.height;

    // Clamp
    relX = Math.max(0, Math.min(1, relX));
    relY = Math.max(0, Math.min(1, relY));

    // Map to -1 to 1 range
    const newX = relX * 2 - 1;
    const newZ = relY * 2 - 1; // Top is -1 (Front), Bottom is 1 (Back) usually in logic, but let's standardise

    // Standard WebAudio Panner:
    // Z: -ve is Front (into screen), +ve is Back (out of screen/behind listener)
    // But visually on a 2D map: Top usually means Front (Away from user/listener).
    // So UI Top (relY=0) -> Z = -1 (Front)
    // UI Bottom (relY=1) -> Z = 1 (Back)

      onChange(newX, newZ);
    },
    [onChange],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setIsDragging(true);
      updatePosition(e.clientX, e.clientY);
    },
    [updatePosition],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      updatePosition(e.clientX, e.clientY);
    },
    [isDragging, updatePosition],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Convert -1..1 to 0..100% for CSS positioning
  const leftPercent = ((x + 1) / 2) * 100;
  const topPercent = ((z + 1) / 2) * 100;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between text-xs text-slate-400">
        <span className="font-bold uppercase tracking-wider">{label}</span>
        <span className="font-mono text-cyan-400 text-[10px]">
          X: {x.toFixed(2)} Z: {z.toFixed(2)}
        </span>
      </div>

      <button
        type="button"
        aria-label="Adjust spatial panner"
        ref={containerRef}
        className="relative aspect-square w-full bg-slate-900 rounded-lg border border-slate-700 shadow-inner cursor-crosshair overflow-hidden group"
        onMouseDown={handleMouseDown}
        style={{
          background:
            'radial-gradient(circle at center, rgba(14, 165, 233, 0.1) 0%, transparent 70%)',
        }}
      >
        {/* Grid Lines */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-400"></div>
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-400"></div>
          {/* Concentric circles for distance */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/2 h-1/2 rounded-full border border-slate-500"></div>
        </div>

        {/* Labels */}
        <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[8px] text-slate-500 font-bold pointer-events-none">
          FRONT
        </span>
        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] text-slate-500 font-bold pointer-events-none">
          BACK
        </span>
        <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[8px] text-slate-500 font-bold pointer-events-none -rotate-90">
          LEFT
        </span>
        <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[8px] text-slate-500 font-bold pointer-events-none rotate-90">
          RIGHT
        </span>

        {/* Listener (Center) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <Icon name="user" className="w-4 h-4 text-slate-600 opacity-50" />
        </div>

        {/* Source Dot */}
        <div
          className="absolute w-4 h-4 bg-cyan-500 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.8)] border-2 border-white transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-75 ease-out"
          style={{ left: `${leftPercent}%`, top: `${topPercent}%` }}
        >
          {/* Ripple effect when dragging */}
          {isDragging && (
            <div className="absolute inset-0 rounded-full animate-ping bg-cyan-400 opacity-75"></div>
          )}
        </div>
      </button>

      <p className="text-[9px] text-slate-500 text-center italic">
        Drag point to position sound relative to listener
      </p>
    </div>
  );
};

export default SpatialPanner;
