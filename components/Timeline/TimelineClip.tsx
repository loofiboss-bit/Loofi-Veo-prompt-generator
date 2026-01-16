
import React from 'react';
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

    // Styles based on type
    const baseStyle = clip.type === 'video' 
        ? 'bg-gradient-to-b from-cyan-600 to-cyan-800 border-cyan-500' 
        : 'bg-gradient-to-b from-purple-600 to-purple-800 border-purple-500';

    const left = clip.startTime * zoomLevel;
    const width = clip.duration * zoomLevel;

    // --- Motion Keyframe Preview Logic ---
    // If the clip is a video/image and has motion config, calculate the current transform
    let motionStyle: React.CSSProperties = {};
    
    if (clip.type === 'video' && shot && shot.motionConfig) {
        const { start, end } = shot.motionConfig;
        
        // Calculate progress (0.0 to 1.0) based on global timeline playback
        const clipProgress = Math.max(0, Math.min(1, (sbTimeline.currentTime - clip.startTime) / clip.duration));
        
        // Lerp function
        const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
        
        // Interpolate Zoom
        const currentZoom = lerp(start.zoom, end.zoom, clipProgress);
        
        // Interpolate Center position (0-1)
        const currentX = lerp(start.x, end.x, clipProgress);
        const currentY = lerp(start.y, end.y, clipProgress);
        
        // CSS Transform Calculation:
        // We want to "Zoom into" (currentX, currentY).
        // transform-origin: 50% 50%;
        // translate: Moving the image so (currentX, currentY) is at center.
        // If x=0.5, translate=0. If x=0.0 (left edge), translate=50% (move image right).
        // Translate % = (0.5 - currentX) * 100 * ZoomFactor? No.
        
        // Correct Logic: 
        // scale(Z) translate( (0.5 - X) * 100%, (0.5 - Y) * 100% )
        // Note: Translate is applied *after* scale if written scale() translate().
        // Actually, easiest is transform-origin based? No, transform-origin is static usually.
        // Let's use translate percentage relative to element size.
        
        const translateX = (0.5 - currentX) * 100;
        const translateY = (0.5 - currentY) * 100;
        
        // We apply this to an inner wrapper to visualize the effect without moving the clip on timeline
        motionStyle = {
            transform: `scale(${currentZoom}) translate(${translateX}%, ${translateY}%)`,
            transformOrigin: 'center center',
            width: '100%',
            height: '100%',
            objectFit: 'cover'
        };
    }

    // TODO: Implement drag and resize handles (MouseDown logic would go here)
    // For now, render static with visual cues

    return (
        <div 
            className={`absolute top-1 bottom-1 rounded-md border text-xs overflow-hidden shadow-sm group select-none cursor-pointer ${baseStyle}`}
            style={{ 
                left: `${left}px`, 
                width: `${width}px`,
                minWidth: '4px'
            }}
            title={`${clip.label} (${clip.duration.toFixed(1)}s)`}
        >
            <div className="w-full h-full relative overflow-hidden">
                {/* Content Layer with Motion */}
                {clip.type === 'video' && shot && (
                    <div className="absolute inset-0 pointer-events-none opacity-40 mix-blend-overlay">
                        {/* We use a div background or img to represent content if available for preview */}
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

            {/* Resize Handles (Visual Only) */}
            <div className="absolute top-0 bottom-0 left-0 w-2 cursor-w-resize hover:bg-white/30 z-20" />
            <div className="absolute top-0 bottom-0 right-0 w-2 cursor-w-resize hover:bg-white/30 z-20" />
        </div>
    );
};

export default TimelineClipView;
