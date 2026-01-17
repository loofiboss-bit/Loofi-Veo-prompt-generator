
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { TimelineState, TimelineClip } from '../../types';
import TimelineTrackView from './TimelineTrack';
import Icon from '../Icon';
import { detectBeats } from '../../services/audioAnalysisService';
import { decodeAudioData, decode } from '../../utils/audio';
import { useAppStore } from '../../store/useAppStore';

interface TimelineProps {
    timelineState: TimelineState;
    onClipUpdate: (id: string, changes: Partial<TimelineClip>) => void;
    onSeek: (time: number) => void;
    duration: number; // Total estimated duration of sequence
    isRecording?: boolean;
    onRecordToggle?: () => void;
}

const Timeline: React.FC<TimelineProps> = ({ timelineState, onClipUpdate, onSeek, duration, isRecording, onRecordToggle }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const rulerRef = useRef<HTMLDivElement>(null);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [beatMarkers, setBeatMarkers] = useState<number[]>([]);
    const [isAnalyzingBeats, setIsAnalyzingBeats] = useState(false);
    const [snapEnabled, setSnapEnabled] = useState(true);

    const { assets } = useAppStore();
    const { tracks, clips, zoomLevel, currentTime } = timelineState;
    const totalWidth = Math.max(duration + 10, 60) * zoomLevel;

    // --- Beat Detection Logic ---
    useEffect(() => {
        // Find the music track clip if it exists
        const musicClip = clips.find(c => c.trackId === 'audio_music');
        
        if (musicClip) {
            const asset = assets.find(a => a.id === String(musicClip.resourceId));
            
            if (asset && asset.data && beatMarkers.length === 0 && !isAnalyzingBeats) {
                const analyze = async () => {
                    setIsAnalyzingBeats(true);
                    try {
                        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                        const audioBuffer = await decodeAudioData(decode(asset.data), ctx, 44100, 1);
                        
                        // Shift beat markers by the clip's start time on timeline
                        const rawBeats = detectBeats(audioBuffer);
                        const shiftedBeats = rawBeats.map(b => b + musicClip.startTime);
                        
                        setBeatMarkers(shiftedBeats);
                        ctx.close();
                    } catch (e) {
                        console.error("Beat detection failed", e);
                    } finally {
                        setIsAnalyzingBeats(false);
                    }
                };
                analyze();
            }
        } else {
            // Clear beats if music removed
            if (beatMarkers.length > 0) setBeatMarkers([]);
        }
    }, [clips, assets, beatMarkers.length, isAnalyzingBeats]);

    // --- Snap Logic ---
    const handleSmartClipUpdate = useCallback((id: string, changes: Partial<TimelineClip>) => {
        if (changes.startTime !== undefined && snapEnabled && beatMarkers.length > 0) {
            const SNAP_THRESHOLD = 0.2; // Snap within 200ms
            
            let bestTime = changes.startTime;
            let minDiff = Infinity;

            for (const beat of beatMarkers) {
                const diff = Math.abs(changes.startTime - beat);
                if (diff < SNAP_THRESHOLD && diff < minDiff) {
                    minDiff = diff;
                    bestTime = beat;
                }
            }

            if (minDiff < SNAP_THRESHOLD) {
                changes.startTime = bestTime;
            }
        }
        onClipUpdate(id, changes);
    }, [onClipUpdate, snapEnabled, beatMarkers]);

    // Sync scroll between ruler and tracks
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        setScrollLeft(e.currentTarget.scrollLeft);
    };

    const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (isRecording) return; 
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left + scrollLeft;
        const time = clickX / zoomLevel;
        onSeek(Math.max(0, time));
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // Render Ruler Ticks
    const renderRuler = () => {
        const ticks = [];
        const step = Math.max(1, Math.floor(100 / zoomLevel));
        for (let i = 0; i < (duration + 10); i += step) {
            ticks.push(
                <div 
                    key={i} 
                    className="absolute bottom-0 border-l border-slate-500 h-2 text-[9px] text-slate-400 pl-1 select-none"
                    style={{ left: `${i * zoomLevel}px` }}
                >
                    {formatTime(i)}
                </div>
            );
        }
        return ticks;
    };

    return (
        <div className="flex flex-col h-full bg-slate-950 select-none">
            {/* Timeline Toolbar */}
            <div className="h-10 bg-slate-900 border-b border-slate-700 flex items-center px-4 justify-between">
                <div className="flex items-center gap-4">
                    <span className="text-xs font-mono text-cyan-400">{formatTime(currentTime)}</span>
                    
                    {onRecordToggle && (
                        <button 
                            onClick={onRecordToggle}
                            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold transition-all ${
                                isRecording 
                                ? 'bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse' 
                                : 'text-slate-400 hover:text-red-400 hover:bg-slate-800'
                            }`}
                            title="Record Dubbing (ADR)"
                        >
                            <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 rounded-sm' : 'bg-current'}`} />
                            {isRecording ? 'REC' : 'ADR'}
                        </button>
                    )}

                    <div className="h-4 w-px bg-slate-700 mx-1" />
                    
                    {/* Snap Toggle */}
                    <button 
                        onClick={() => setSnapEnabled(!snapEnabled)}
                        className={`text-xs flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                            snapEnabled ? 'text-fuchsia-400 bg-fuchsia-900/20' : 'text-slate-500 hover:text-slate-300'
                        }`}
                        title={snapEnabled ? "Snap to Beat: ON" : "Snap to Beat: OFF"}
                    >
                        <Icon name="activity" className="w-3.5 h-3.5" />
                        Snap
                    </button>

                    <div className="h-4 w-px bg-slate-700 mx-1" />
                    <button className="text-slate-400 hover:text-white"><Icon name="scissors" className="w-4 h-4" /></button>
                    <button className="text-slate-400 hover:text-white"><Icon name="copy" className="w-4 h-4" /></button>
                </div>
                <div className="flex items-center gap-2">
                    {isAnalyzingBeats && (
                        <span className="text-[9px] text-fuchsia-400 animate-pulse mr-2">Detecting Beats...</span>
                    )}
                    <Icon name="search" className="w-3 h-3 text-slate-500" />
                    <input 
                        type="range" 
                        min="5" 
                        max="100" 
                        value={zoomLevel} 
                        readOnly 
                        className="w-24 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer" 
                    />
                </div>
            </div>

            {/* Ruler */}
            <div className="flex h-8 bg-slate-900 border-b border-slate-700">
                <div className="w-48 border-r border-slate-700 bg-slate-900 z-20 shadow-md"></div>
                <div 
                    className="flex-grow overflow-hidden relative cursor-pointer"
                    ref={rulerRef}
                    onMouseDown={handleRulerClick}
                >
                    <div 
                        className="h-full relative" 
                        style={{ width: `${totalWidth}px`, transform: `translateX(-${scrollLeft}px)` }}
                    >
                        {renderRuler()}
                        {/* Render Beats on Ruler too for reference */}
                        {beatMarkers.map((time, idx) => (
                            <div 
                                key={`ruler-${idx}`}
                                className="absolute bottom-0 h-3 w-px bg-fuchsia-500/50"
                                style={{ left: `${time * zoomLevel}px` }}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Tracks Container */}
            <div 
                className="flex-grow overflow-auto relative custom-scrollbar"
                onScroll={handleScroll}
                ref={containerRef}
            >
                <div className="relative" style={{ width: `${totalWidth + 192}px` }}>
                    {/* Playhead Line */}
                    <div 
                        className={`absolute top-0 bottom-0 w-px z-50 pointer-events-none transition-colors ${isRecording ? 'bg-red-500' : 'bg-white'}`}
                        style={{ left: `${(currentTime * zoomLevel) + 192}px` }} 
                    >
                        <div className={`w-3 h-3 transform -translate-x-1.5 rotate-45 -mt-1.5 ${isRecording ? 'bg-red-500' : 'bg-white'}`} />
                    </div>

                    {tracks.map(track => (
                        <TimelineTrackView
                            key={track.id}
                            track={track}
                            clips={clips.filter(c => c.trackId === track.id)}
                            zoomLevel={zoomLevel}
                            duration={duration + 10}
                            onClipUpdate={handleSmartClipUpdate}
                            beatMarkers={snapEnabled ? beatMarkers : undefined}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Timeline;
