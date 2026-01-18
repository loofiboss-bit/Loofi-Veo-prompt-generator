
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { TimelineState, TimelineClip } from '../../types';
import TimelineTrackView from './TimelineTrack';
import Icon from '../Icon';
import { detectBeats, detectSilence } from '../../services/audioAnalysisService';
import { applySmartCut } from '../../utils/timelineUtils';
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
    
    // Smart Cut State
    const [isSmartCutting, setIsSmartCutting] = useState(false);
    const [showSmartCutConfig, setShowSmartCutConfig] = useState(false);
    const [scThreshold, setScThreshold] = useState(-40); // dB
    const [scMinDuration, setScMinDuration] = useState(0.5); // seconds

    const { assets, sbTimeline, addTimelineClip, updateTimelineClip } = useAppStore(); // Need access to timeline actions
    // Note: onClipUpdate prop is for *single* clip updates. For structure changes (delete/add), we need store actions.
    // The props passed from parent currently don't include add/delete. We'll use the store hook directly.
    
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

    // --- Smart Cut Logic ---
    const handleSmartCut = async () => {
        setShowSmartCutConfig(false);
        setIsSmartCutting(true);

        try {
            // 1. Identify Target Clips (Dialogue Track)
            // Smart Cut applies to dialogue primarily
            const targetClips = clips.filter(c => c.trackId === 'audio_dialogue' || c.trackId === 'video_main');
            
            if (targetClips.length === 0) {
                alert("No clips found on Dialogue or Video tracks to analyze.");
                setIsSmartCutting(false);
                return;
            }

            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const newClipsToAdd: TimelineClip[] = [];
            const clipIdsToRemove: string[] = [];

            // Process sequentially
            for (const clip of targetClips) {
                const asset = assets.find(a => a.id === String(clip.resourceId));
                if (!asset || !asset.data) continue;

                // 2. Decode Audio
                const audioBuffer = await decodeAudioData(decode(asset.data), ctx, 44100, 1);

                // 3. Detect Silence
                const silenceRanges = detectSilence(audioBuffer, scThreshold, scMinDuration);

                if (silenceRanges.length > 0) {
                    // 4. Generate New Clips
                    const choppedClips = applySmartCut(clip, silenceRanges);
                    
                    // Mark old for removal, stage new for addition
                    clipIdsToRemove.push(clip.id);
                    newClipsToAdd.push(...choppedClips);
                }
            }
            ctx.close();

            // 5. Update Store (Atomic-ish update simulation)
            if (newClipsToAdd.length > 0) {
                // We need to access the raw clips array from store to perform delete/add
                // Since updateTimelineClip is granular, we'll use a hack to rebuild:
                // Actually, useAppStore exposes setSbTimeline or specific add methods.
                // We'll use a custom update pattern:
                
                // Get current full state
                const currentTimeline = useAppStore.getState().sbTimeline;
                let updatedClips = currentTimeline.clips.filter(c => !clipIdsToRemove.includes(c.id));
                updatedClips = [...updatedClips, ...newClipsToAdd];
                
                // Update Store
                useAppStore.setState(state => ({
                    sbTimeline: {
                        ...state.sbTimeline,
                        clips: updatedClips
                    }
                }));
            }

        } catch (e) {
            console.error("Smart Cut failed", e);
            alert("Failed to process Smart Cut.");
        } finally {
            setIsSmartCutting(false);
        }
    };

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

                    {/* Smart Cut Button */}
                    <div className="relative">
                        <button 
                            onClick={() => setShowSmartCutConfig(!showSmartCutConfig)}
                            disabled={isSmartCutting}
                            className={`text-xs flex items-center gap-1 px-2 py-1 rounded transition-colors ${isSmartCutting ? 'text-cyan-400 bg-cyan-900/20 animate-pulse' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                            title="Remove Silence"
                        >
                            <Icon name={isSmartCutting ? "spinner" : "scissors"} className={`w-3.5 h-3.5 ${isSmartCutting ? 'animate-spin' : ''}`} />
                            Auto-Cut
                        </button>
                        
                        {showSmartCutConfig && (
                            <div className="absolute top-full left-0 mt-2 bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-2xl z-50 w-64 animate-fade-in-up">
                                <h4 className="text-xs font-bold text-slate-300 uppercase mb-3">Silence Removal</h4>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-[10px] text-slate-400 block mb-1">Threshold: {scThreshold}dB</label>
                                        <input 
                                            type="range" min="-60" max="0" step="1" 
                                            value={scThreshold} onChange={(e) => setScThreshold(parseInt(e.target.value))}
                                            className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-slate-400 block mb-1">Min Pause: {scMinDuration}s</label>
                                        <input 
                                            type="range" min="0.1" max="2.0" step="0.1" 
                                            value={scMinDuration} onChange={(e) => setScMinDuration(parseFloat(e.target.value))}
                                            className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>
                                    <button 
                                        onClick={handleSmartCut}
                                        className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold mt-2"
                                    >
                                        Apply Cut
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="h-4 w-px bg-slate-700 mx-1" />
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
