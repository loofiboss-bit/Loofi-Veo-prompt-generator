
import React from 'react';
import { TimelineTrack, TimelineClip } from '../../types';
import TimelineClipView from './TimelineClip';
import Icon from '../Icon';

interface TimelineTrackProps {
    track: TimelineTrack;
    clips: TimelineClip[];
    zoomLevel: number;
    duration: number; // Total timeline duration for min-width
    onClipUpdate: (id: string, changes: Partial<TimelineClip>) => void;
}

const TimelineTrackView: React.FC<TimelineTrackProps> = ({ track, clips, zoomLevel, duration, onClipUpdate }) => {
    return (
        <div className="flex h-24 border-b border-slate-700/50 bg-slate-900">
            {/* Track Header */}
            <div className="w-48 flex-shrink-0 border-r border-slate-700 bg-slate-800/50 p-2 flex flex-col justify-center z-10 shadow-lg">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider truncate" title={track.label}>
                        {track.label}
                    </span>
                    <div className="flex gap-1">
                        <button className="p-1 text-slate-500 hover:text-red-400">
                            <Icon name="filter" className="w-3 h-3" /> {/* Mute/Hide */}
                        </button>
                        <button className="p-1 text-slate-500 hover:text-white">
                            <Icon name="save" className="w-3 h-3" /> {/* Lock */}
                        </button>
                    </div>
                </div>
                <div className="flex gap-2">
                    {/* Fake volume/opacity meter */}
                    <div className="h-1 w-full bg-slate-700 rounded-full overflow-hidden mt-2">
                        <div className="h-full bg-green-500 w-3/4" />
                    </div>
                </div>
            </div>

            {/* Track Content (Scroller handled by parent) */}
            <div className="relative flex-grow h-full bg-[linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)]" 
                 style={{ 
                     backgroundSize: `${zoomLevel}px 100%`, 
                     minWidth: `${duration * zoomLevel}px`
                 }}
            >
                {clips.map(clip => (
                    <TimelineClipView 
                        key={clip.id} 
                        clip={clip} 
                        zoomLevel={zoomLevel} 
                        onUpdate={onClipUpdate}
                    />
                ))}
            </div>
        </div>
    );
};

export default TimelineTrackView;
