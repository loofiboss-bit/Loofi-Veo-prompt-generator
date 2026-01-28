

import React, { useState, useEffect } from 'react';
import { TimelineClip, Shot } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import Icon from '../Icon';

interface TimelineClipProps {
    clip: TimelineClip;
    zoomLevel: number;
    onUpdate: (id: string, changes: Partial<TimelineClip>) => void;
    onSelect?: (clip: TimelineClip) => void;
    isSelected?: boolean;
}

const TimelineClipView: React.FC<TimelineClipProps> = ({ clip, zoomLevel, onUpdate, onSelect, isSelected }) => {
    // Access global store to get actual Shot data including MotionConfig
    const { sbShots, sbTimeline } = useAppStore();
    const shot = sbShots.find(s => s.id === clip.resourceId) as Shot | undefined;

    // Local state for dragging
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartX, setDragStartX] = useState(0);
    const [initialStartTime, setInitialStartTime] = useState(0);
    
    // Drag threshold logic
    const [mouseDownX, setMouseDownX] = useState(0);

    // Styles based on type
    let baseStyle = clip.type === 'video' 
        ? 'bg-gradient-to-b from-cyan-600 to-cyan-800 border-cyan-500' 
        : 'bg-gradient-to-b from-purple-600 to-purple-800 border-purple-500';

    // Ghost Clip Style (Loading)
    if (clip.isLoading) {
        baseStyle = 'bg-slate-800/50 border-slate-600 border-dashed animate-pulse';
    }
    
    // Selection Style
    const selectionStyle = isSelected ? 'ring-2 ring-white z-20' : '';

    const left = clip.startTime * zoomLevel;
    const width = clip.duration * zoomLevel;

    // --- Drag Handlers ---
    const handleMouseDown = (e: React.MouseEvent) => {
        if (clip.isLoading) return; // Prevent dragging while generating
        e.stopPropagation(); // Prevent track or other events
        
        setMouseDownX(e.clientX);
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
        
        onUpdate(clip.id, { startTime: newStartTime });
    };

    const handleGlobalMouseUp = (e: MouseEvent) => {
        setIsDragging(false);
        window.removeEventListener('mousemove', handleGlobalMouseMove);
        window.removeEventListener('mouseup', handleGlobalMouseUp);
        
        // Handle Selection (if drag distance was small)
        if (Math.abs(e.clientX - mouseDownX) < 5) {
            if (onSelect) onSelect(clip);
        }
    };

    useEffect(() => {
        if (!isDragging) return;

        const onMove = (e: MouseEvent) => {
            const deltaX = e.clientX - dragStartX;
            const deltaTime = deltaX / zoomLevel;
            let newStartTime = Math.max(0, initialStartTime + deltaTime);
            onUpdate(clip.id, { startTime: newStartTime });
        };

        const onUp = (e: MouseEvent) => {
            setIsDragging(false);
            if (Math.abs(e.clientX - mouseDownX) < 5) {
                if (onSelect) onSelect(clip);
            }
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);

        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, [isDragging, dragStartX, initialStartTime, zoomLevel, clip.id, onUpdate, mouseDownX, onSelect, clip]);


    // --- Motion Keyframe Preview Logic ---
    let motionStyle: React.CSSProperties = {};
    
    // Apply Transform from Clip Properties (Inspector override) if available, else fallback to Shot MotionConfig
    // Note: Inspector modifies clip.transform directly.
    
    if (clip.transform) {
        const { scale, position, rotation, opacity } = clip.transform;
        motionStyle = {
            transform: `scale(${scale / 100}) translate(${position.x}%, ${position.y}%) rotate(${rotation}deg)`,
            transformOrigin: 'center center',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: opacity / 100
        };
    } else if (clip.type === 'video' && shot && shot.motionConfig && !clip.isLoading) {
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

    // Apply Color Grade
    const filterString = clip.colorGrade ? 
        `brightness(${clip.colorGrade.brightness}) contrast(${clip.colorGrade.contrast}) saturate(${clip.colorGrade.saturation}) hue-rotate(${clip.colorGrade.hueRotate}deg) sepia(${clip.colorGrade.sepia})` 
        : undefined;

    const combinedStyle = {
        ...motionStyle,
        filter: filterString
    };

    return (
        <div 
            onMouseDown={handleMouseDown}
            className={`absolute top-1 bottom-1 rounded-md border text-xs overflow-hidden shadow-sm group select-none ${clip.isLoading ? 'cursor-wait' : 'cursor-grab active:cursor-grabbing'} ${baseStyle} ${selectionStyle} ${isDragging ? 'z-50 shadow-xl opacity-90' : 'z-10'}`}
            style={{ 
                left: `${left}px`, 
                width: `${width}px`,
                minWidth: '4px'
            }}
            title={`${clip.label} (${clip.duration.toFixed(1)}s)`}
        >
            <div className="w-full h-full relative overflow-hidden pointer-events-none">
                {/* Content Layer with Motion & Color */}
                {clip.type === 'video' && shot && !clip.isLoading && (
                    <div className="absolute inset-0 pointer-events-none opacity-40 mix-blend-overlay">
                        {shot.conceptImageUrl ? (
                            <img 
                                src={shot.conceptImageUrl} 
                                alt="" 
                                className="w-full h-full object-cover transition-transform duration-75 ease-linear"
                                style={combinedStyle}
                            />
                        ) : (
                            <div className="w-full h-full bg-black/20" />
                        )}
                    </div>
                )}

                <div className="relative z-10 w-full h-full px-2 py-1 flex flex-col justify-center">
                    <div className="flex items-center gap-1">
                        {clip.isLoading && <Icon name="spinner" className="w-3 h-3 animate-spin text-fuchsia-400" />}
                        <span className={`font-bold truncate drop-shadow-md ${clip.isLoading ? 'text-fuchsia-200 italic' : 'text-white'}`}>
                            {clip.label}
                        </span>
                    </div>
                    {((shot?.motionConfig || clip.transform) && !clip.isLoading) && (
                        <span className="text-[8px] text-fuchsia-200 uppercase tracking-tighter">★ Motion</span>
                    )}
                    {clip.colorGrade && !clip.isLoading && (
                        <span className="text-[8px] text-cyan-200 uppercase tracking-tighter ml-1">★ Color</span>
                    )}
                </div>
            </div>

            {/* Resize Handles (Visual Only) */}
            {!clip.isLoading && (
                <>
                    <div className="absolute top-0 bottom-0 left-0 w-2 cursor-w-resize hover:bg-white/30 z-20 pointer-events-auto" onMouseDown={(e) => e.stopPropagation() /* Prevent move */} />
                    <div className="absolute top-0 bottom-0 right-0 w-2 cursor-w-resize hover:bg-white/30 z-20 pointer-events-auto" onMouseDown={(e) => e.stopPropagation() /* Prevent move */} />
                </>
            )}
        </div>
    );
};

export default TimelineClipView;
