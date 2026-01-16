
import React from 'react';
import { TimelineClip } from '../../types';
import Icon from '../Icon';

interface TimelineClipProps {
    clip: TimelineClip;
    zoomLevel: number;
    onUpdate: (id: string, changes: Partial<TimelineClip>) => void;
}

const TimelineClipView: React.FC<TimelineClipProps> = ({ clip, zoomLevel, onUpdate }) => {
    // Styles based on type
    const baseStyle = clip.type === 'video' 
        ? 'bg-gradient-to-b from-cyan-600 to-cyan-800 border-cyan-500' 
        : 'bg-gradient-to-b from-purple-600 to-purple-800 border-purple-500';

    const left = clip.startTime * zoomLevel;
    const width = clip.duration * zoomLevel;

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
            <div className="w-full h-full px-2 py-1 flex flex-col justify-center">
                <span className="font-bold text-white truncate drop-shadow-md">{clip.label}</span>
                {width > 60 && (
                    <div className="h-2 w-full mt-1 opacity-50 flex items-center gap-0.5">
                        {/* Fake Waveform / Filmstrip graphic */}
                        {clip.type === 'audio' ? (
                            Array.from({ length: 10 }).map((_, i) => (
                                <div key={i} className="flex-1 bg-white/50 rounded-sm" style={{ height: `${Math.random() * 100}%` }} />
                            ))
                        ) : (
                            Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="aspect-video h-full bg-black/20 border border-white/10" />
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Resize Handles (Visual Only) */}
            <div className="absolute top-0 bottom-0 left-0 w-2 cursor-w-resize hover:bg-white/30" />
            <div className="absolute top-0 bottom-0 right-0 w-2 cursor-w-resize hover:bg-white/30" />
        </div>
    );
};

export default TimelineClipView;
