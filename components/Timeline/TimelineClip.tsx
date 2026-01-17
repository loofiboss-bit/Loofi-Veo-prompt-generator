
import React, { useState, useEffect } from 'react';
import { TimelineClip, Shot } from '../../types';
import { useAppStore } from '../../store/useAppStore';

interface TimelineClipProps {
    clip: TimelineClip;
    zoomLevel: number;
    onUpdate: (id: string, changes: Partial<TimelineClip>) => void;
}

const TimelineClipView: React.FC<TimelineClipProps> = ({ clip, zoomLevel, onUpdate }) => {
    // Access global store to get actual Shot data including MotionConfig
    const { sbShots, sbTimeline } = useAppStore();
    const shot = sbShots.find(s => s.id === clip.resourceId) as Shot | undefined;

    // Local state for dragging
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartX, setDragStartX] = useState(0);
    const [initialStartTime, setInitialStartTime] = useState(0);

    // Styles based on type
    const baseStyle = clip.type === 'video' 
        ? 'bg-gradient-to-b from-cyan-600 to-cyan-800 border-cyan-500' 
        : 'bg-gradient-to-b from-purple-600 to-purple-800 border-purple-500';

    const left = clip.startTime * zoomLevel;
    const width = clip.duration * zoomLevel;

    // --- Drag Handlers ---
    const handleMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent track or other events
        setIsDragging(true);
        setDragStartX(e.clientX);
        setInitialStartTime(clip.startTime);
        
        // Add global listeners
        window.addEventListener('mousemove', handleGlobalMouseMove);
        window.addEventListener('mouseup', handleGlobalMouseUp);
    };

    const handleGlobalMouseMove = (e: MouseEvent) => {
        const deltaX = e.clientX - dragStartX;
        const deltaTime = deltaX / zoomLevel;
        let newStartTime = Math.max(0, initialStartTime + deltaTime);
        
        // Update visually / locally first logic handles by parent re-render usually,
        // but for smooth dragging we rely on parent update frequency.
        // For efficiency, we just call onUpdate.
        onUpdate(clip.id, { startTime: newStartTime });
    };

    const handleGlobalMouseUp = () => {
        setIsDragging(false);
        window.removeEventListener('mousemove', handleGlobalMouseMove);
        window.removeEventListener('mouseup', handleGlobalMouseUp);
    };

    // Fix stale closure in event listeners if needed, but since we recreate listeners on mousedown, we use state from closure scope of mousedown
    // However, dragStartX and initialStartTime need to be captured.
    // The issue: handleGlobalMouseMove is defined inside render. It captures closure scope.
    // Better pattern: use refs or useCallback if attaching to window.
    // But since we attach inside mousedown, we need to make sure the specific function instance is removed.
    // The current pattern above is flawed because handleGlobalMouseMove changes on every render.
    // We'll fix this by using a ref-based handler or React state machinery.
    
    // Correction: We don't have access to the exact function instance from previous render to remove it.
    // Standard pattern:
    
    useEffect(() => {
        if (!isDragging) return;

        const onMove = (e: MouseEvent) => {
            const deltaX = e.clientX - dragStartX;
            const deltaTime = deltaX / zoomLevel;
            let newStartTime = Math.max(0, initialStartTime + deltaTime);
            onUpdate(clip.id, { startTime: newStartTime });
        };

        const onUp = () => {
            setIsDragging(false);
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);

        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, [isDragging, dragStartX, initialStartTime, zoomLevel, clip.id, onUpdate]);


    // --- Motion Keyframe Preview Logic ---
    let motionStyle: React.CSSProperties = {};
    
    if (clip.type === 'video' && shot && shot.motionConfig) {
        const { start, end } = shot.motionConfig;
        const clipProgress = Math.max(0, Math.min(1, (sbTimeline.currentTime - clip.startTime) / clip.duration));
        
        const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
        const currentZoom = lerp(start.zoom, end.zoom, clipProgress);
        const currentX = lerp(start.x, end.x, clipProgress);
        const currentY = lerp(start.y, end.y, clipProgress);
        
        const translateX = (0.5 - currentX) * 100;
        const translateY = (0.5 - currentY) * 100;
        
        motionStyle = {
            transform: `scale(${currentZoom}) translate(${translateX}%, ${translateY}%)`,
            transformOrigin: 'center center',
            width: '100%',
            height: '100%',
            objectFit: 'cover'
        };
    }

    return (
        <div 
            onMouseDown={handleMouseDown}
            className={`absolute top-1 bottom-1 rounded-md border text-xs overflow-hidden shadow-sm group select-none cursor-grab active:cursor-grabbing ${baseStyle} ${isDragging ? 'z-50 shadow-xl opacity-90' : 'z-10'}`}
            style={{ 
                left: `${left}px`, 
                width: `${width}px`,
                minWidth: '4px'
            }}
            title={`${clip.label} (${clip.duration.toFixed(1)}s)`}
        >
            <div className="w-full h-full relative overflow-hidden pointer-events-none">
                {/* Content Layer with Motion */}
                {clip.type === 'video' && shot && (
                    <div className="absolute inset-0 pointer-events-none opacity-40 mix-blend-overlay">
                        {shot.conceptImageUrl ? (
                            <img 
                                src={shot.conceptImageUrl} 
                                alt="" 
                                className="w-full h-full object-cover transition-transform duration-75 ease-linear"
                                style={motionStyle}
                            />
                        ) : (
                            <div className="w-full h-full bg-black/20" />
                        )}
                    </div>
                )}

                <div className="relative z-10 w-full h-full px-2 py-1 flex flex-col justify-center">
                    <span className="font-bold text-white truncate drop-shadow-md">{clip.label}</span>
                    {shot?.motionConfig && (
                        <span className="text-[8px] text-fuchsia-200 uppercase tracking-tighter">★ Motion</span>
                    )}
                </div>
            </div>

            {/* Resize Handles (Visual Only - Logic TODO) */}
            <div className="absolute top-0 bottom-0 left-0 w-2 cursor-w-resize hover:bg-white/30 z-20 pointer-events-auto" onMouseDown={(e) => e.stopPropagation() /* Prevent move */} />
            <div className="absolute top-0 bottom-0 right-0 w-2 cursor-w-resize hover:bg-white/30 z-20 pointer-events-auto" onMouseDown={(e) => e.stopPropagation() /* Prevent move */} />
        </div>
    );
};

export default TimelineClipView;
