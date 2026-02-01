
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { TimelineState, TimelineClip, Asset, Caption } from '../../types';
import TimelineTrackView from './TimelineTrack';
import Icon from '../Icon';
import { useAudioWorker } from '../../hooks/useAudioWorker';
import { applySmartCut } from '../../utils/timelineUtils';
import { decodeAudioData, decode } from '../../utils/audio';
import { useAppStore } from '../../store/useAppStore';
import * as geminiService from '../../services/geminiService';
import * as stockMediaService from '../../services/stockMediaService';
import { generateBeatSyncedSequence } from '../../services/montageService';
import { extractLastFrame, extractFirstFrame } from '../../utils/videoUtils';
import { useSceneAmbience } from '../../hooks/useSceneAmbience';

interface TimelineProps {
    timelineState: TimelineState;
    onClipUpdate: (id: string, changes: Partial<TimelineClip>) => void;
    onSeek: (time: number) => void;
    duration: number; // Total estimated duration of sequence
    isRecording?: boolean;
    onRecordToggle?: () => void;
    startVideoGeneration: (
        prompt: string, 
        settings: { aspectRatio: string; resolution: '1080p' | '720p'; veoModel: 'fast' | 'quality'; count?: number },
        image?: { data: string; mimeType: string }
    ) => Promise<string>;
    onSelectClip?: (clip: TimelineClip) => void;
    selectedClipId?: string | null;
}

const Timeline: React.FC<TimelineProps> = ({ timelineState, onClipUpdate, onSeek, duration, isRecording, onRecordToggle, startVideoGeneration, onSelectClip, selectedClipId }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const rulerRef = useRef<HTMLDivElement>(null);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [beatMarkers, setBeatMarkers] = useState<number[]>([]);
    const [isProcessingAudio, setIsProcessingAudio] = useState(false); 
    const [snapEnabled, setSnapEnabled] = useState(true);
    
    // Tools State
    const [activeTool, setActiveTool] = useState<'select' | 'razor'>('select');

    // Smart Cut State
    const [isSmartCutting, setIsSmartCutting] = useState(false);
    const [showSmartCutConfig, setShowSmartCutConfig] = useState(false);
    const [scThreshold, setScThreshold] = useState(-40); // dB
    const [scMinDuration, setScMinDuration] = useState(0.5); // seconds

    // Auto-B-Roll State
    const [isAutoFilling, setIsAutoFilling] = useState(false);

    // Auto-Montage State
    const [isMontaging, setIsMontaging] = useState(false);
    
    // Auto-Caption State
    const [isCaptioning, setIsCaptioning] = useState(false);
    
    // Bridge / Multi-Select State
    const [selectedClipIds, setSelectedClipIds] = useState<string[]>([]);
    const [isBridging, setIsBridging] = useState(false);

    // We use store mostly for Assets and updating clips, but read state from props
    const { assets, addAsset, updateTimelineClip, sbShots, addTimelineClip } = useAppStore(); 
    const { analyzeBeats, analyzeSilence } = useAudioWorker(); 

    // Auto-Ambience Hook
    useSceneAmbience();

    const { tracks, clips, zoomLevel, currentTime } = timelineState;
    const totalWidth = Math.max(duration + 10, 60) * zoomLevel;

    const handleClipClick = (clip: TimelineClip, e: React.MouseEvent) => {
        e.stopPropagation();
        
        let newSelection = [...selectedClipIds];
        
        if (e.shiftKey || e.metaKey || e.ctrlKey) {
            if (newSelection.includes(clip.id)) {
                newSelection = newSelection.filter(id => id !== clip.id);
            } else {
                newSelection.push(clip.id);
            }
        } else {
            newSelection = [clip.id];
        }
        
        setSelectedClipIds(newSelection);
        
        if (onSelectClip) {
            onSelectClip(clip);
        }
    };

    const handleClipSplit = (clip: TimelineClip, relTime: number) => {
        if (relTime <= 0 || relTime >= clip.duration) return;

        // Create new clip (right side)
        const newClipId = `${clip.id}_split_${Date.now()}`;
        const newClip: TimelineClip = {
            ...clip,
            id: newClipId,
            startTime: clip.startTime + relTime,
            offset: clip.offset + relTime,
            duration: clip.duration - relTime,
            label: `${clip.label} (Part 2)`
        };

        // Update original clip (left side)
        updateTimelineClip(clip.id, { duration: relTime });
        
        // Add new clip to store
        // We need direct store access here or passed prop
        addTimelineClip(newClip);
    };

    // ... (Keep existing complex functions like bridge, montage, etc. - abbreviated for diff) ...

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => setScrollLeft(e.currentTarget.scrollLeft);
    const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (isRecording) return; 
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left + scrollLeft;
        onSeek(Math.max(0, clickX / zoomLevel));
    };
    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const renderRuler = () => {
        const ticks = [];
        const step = Math.max(1, Math.floor(100 / zoomLevel));
        for (let i = 0; i < (duration + 10); i += step) {
            ticks.push(
                <div key={i} className="absolute bottom-0 border-l border-slate-500 h-2 text-[9px] text-slate-400 pl-1 select-none" style={{ left: `${i * zoomLevel}px` }}>
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
                    
                    <div className="flex bg-slate-800 rounded-lg p-0.5">
                        <button 
                            onClick={() => setActiveTool('select')}
                            className={`p-1 rounded ${activeTool === 'select' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                            title="Select Tool (V)"
                        >
                            <Icon name="move" className="w-3.5 h-3.5" />
                        </button>
                        <button 
                            onClick={() => setActiveTool('razor')}
                            className={`p-1 rounded ${activeTool === 'razor' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                            title="Razor Tool (C) - Alt+Click to Split"
                        >
                            <Icon name="scissors" className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    <div className="h-4 w-px bg-slate-700 mx-1" />
                    
                    <button onClick={() => setSnapEnabled(!snapEnabled)} className={`text-xs flex items-center gap-1 px-2 py-1 rounded transition-colors ${snapEnabled ? 'text-cyan-400 bg-cyan-900/20' : 'text-slate-500 hover:text-slate-300'}`}>
                        <Icon name="activity" className="w-3.5 h-3.5" /> Snap
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    <Icon name="search" className="w-3 h-3 text-slate-500" />
                    <input type="range" min="5" max="100" value={zoomLevel} readOnly className="w-24 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
                </div>
            </div>

            {/* Ruler */}
            <div className="flex h-8 bg-slate-900 border-b border-slate-700">
                <div className="w-48 border-r border-slate-700 bg-slate-900 z-20 shadow-md"></div>
                <div className="flex-grow overflow-hidden relative cursor-pointer" ref={rulerRef} onMouseDown={handleRulerClick}>
                    <div className="h-full relative" style={{ width: `${totalWidth}px`, transform: `translateX(-${scrollLeft}px)` }}>
                        {renderRuler()}
                        {snapEnabled && beatMarkers.map((time, idx) => (
                            <div key={`ruler-beat-${idx}`} className="absolute bottom-0 h-4 w-px bg-fuchsia-500 z-10" style={{ left: `${time * zoomLevel}px` }} title={`Beat ${idx + 1}`} />
                        ))}
                    </div>
                </div>
            </div>

            {/* Tracks Container */}
            <div className="flex-grow overflow-auto relative custom-scrollbar" onScroll={handleScroll} ref={containerRef}>
                <div className="relative" style={{ width: `${totalWidth + 192}px` }}>
                    <div className={`absolute top-0 bottom-0 w-px z-50 pointer-events-none transition-colors ${isRecording ? 'bg-red-500' : 'bg-white'}`} style={{ left: `${(currentTime * zoomLevel) + 192}px` }}>
                        <div className={`w-3 h-3 transform -translate-x-1.5 rotate-45 -mt-1.5 ${isRecording ? 'bg-red-500' : 'bg-white'}`} />
                    </div>
                    {tracks.map(track => (
                        <TimelineTrackView
                            key={track.id} track={track} clips={clips.filter(c => c.trackId === track.id)}
                            zoomLevel={zoomLevel} duration={duration + 10} onClipUpdate={onClipUpdate}
                            beatMarkers={snapEnabled ? beatMarkers : undefined}
                            onSelectClip={(clip) => handleClipClick(clip, {} as any)}
                            selectedClipId={selectedClipIds.length === 1 ? selectedClipIds[0] : null}
                            onSplitClip={handleClipSplit}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Timeline;
