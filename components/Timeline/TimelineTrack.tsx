
import React from 'react';
import { TimelineTrack, TimelineClip, ClipTransition } from '../../types';
import TimelineClipView from './TimelineClip';
import TransitionHandle from '../TransitionHandle';
import Icon from '../Icon';
import { useAppStore } from '../../store/useAppStore';

interface TimelineTrackProps {
    track: TimelineTrack;
    clips: TimelineClip[];
    zoomLevel: number;
    duration: number; // Total timeline duration for min-width
    onClipUpdate: (id: string, changes: Partial<TimelineClip>) => void;
    beatMarkers?: number[]; // Timestamps of beats
}

const TimelineTrackView: React.FC<TimelineTrackProps> = ({ track, clips, zoomLevel, duration, onClipUpdate, beatMarkers }) => {
    const { updateShotTransition } = useAppStore();

    const handleTransitionUpdate = (clip: TimelineClip, transition: ClipTransition) => {
        // We update the underlying Shot resource
        if (typeof clip.resourceId === 'number') {
            updateShotTransition(clip.resourceId, transition);
        }
    };

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
                        <div className={`h-full w-3/4 ${track.type === 'audio' ? 'bg-fuchsia-500' : 'bg-cyan-500'}`} />
                    </div>
                </div>
            </div>

            {/* Track Content */}
            <div className="relative flex-grow h-full bg-[linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)]" 
                 style={{ 
                     backgroundSize: `${zoomLevel}px 100%`, 
                     minWidth: `${duration * zoomLevel}px`
                 }}
            >
                {/* Beat Markers Overlay */}
                {beatMarkers && beatMarkers.length > 0 && (
                    <div className="absolute inset-0 pointer-events-none">
                        {beatMarkers.map((time, idx) => (
                            <div 
                                key={idx}
                                className="absolute top-0 bottom-0 border-l border-fuchsia-500/30"
                                style={{ left: `${time * zoomLevel}px` }}
                            />
                        ))}
                    </div>
                )}

                {clips.map((clip, index) => {
                    // Render Transition Handle before the clip (if it's not the first clip)
                    // Logic: Transition exists on the *start* of a clip, affecting the transition FROM the previous clip.
                    const showHandle = track.type === 'video' && index > 0;
                    
                    return (
                        <React.Fragment key={clip.id}>
                            {showHandle && (
                                <TransitionHandle 
                                    transition={clip.transition || { type: 'cut', duration: 0 }} 
                                    onUpdate={(t) => handleTransitionUpdate(clip, t)}
                                    left={clip.startTime * zoomLevel}
                                    zoomLevel={zoomLevel}
                                />
                            )}
                            <TimelineClipView 
                                clip={clip} 
                                zoomLevel={zoomLevel} 
                                onUpdate={onClipUpdate}
                            />
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};

export default TimelineTrackView;
