
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { TimelineState, TimelineClip, Asset, Caption } from '../../types';
import TimelineTrackView from './TimelineTrack';
import Icon from '../Icon';
import { useAudioWorker } from '../../hooks/useAudioWorker'; // Updated Hook
import { applySmartCut } from '../../utils/timelineUtils';
import { decodeAudioData, decode } from '../../utils/audio';
import { useAppStore } from '../../store/useAppStore';
import * as geminiService from '../../services/geminiService';
import * as stockMediaService from '../../services/stockMediaService';
import { generateBeatSyncedSequence } from '../../services/montageService';

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
}

const Timeline: React.FC<TimelineProps> = ({ timelineState, onClipUpdate, onSeek, duration, isRecording, onRecordToggle, startVideoGeneration }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const rulerRef = useRef<HTMLDivElement>(null);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [beatMarkers, setBeatMarkers] = useState<number[]>([]);
    const [isProcessingAudio, setIsProcessingAudio] = useState(false); // New Processing State
    const [snapEnabled, setSnapEnabled] = useState(true);
    
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

    const { assets, sbTimeline, addTimelineClip, updateTimelineClip, addAsset, sbShots } = useAppStore(); 
    const { analyzeBeats, analyzeSilence } = useAudioWorker(); // Worker Hook

    const { tracks, clips, zoomLevel, currentTime } = timelineState;
    const totalWidth = Math.max(duration + 10, 60) * zoomLevel;

    // --- Beat Detection Logic (Worker Optimized) ---
    useEffect(() => {
        // Find the music track clip if it exists
        const musicClip = clips.find(c => c.trackId === 'audio_music');
        
        if (musicClip) {
            const asset = assets.find(a => a.id === String(musicClip.resourceId));
            
            // Only analyze if we haven't already, or if the music changed
            if (asset && asset.data && beatMarkers.length === 0 && !isProcessingAudio) {
                const runAnalysis = async () => {
                    setIsProcessingAudio(true);
                    try {
                        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                        const audioBuffer = await decodeAudioData(decode(asset.data), ctx, 44100, 1);
                        
                        // Use Worker Hook
                        const rawBeats = await analyzeBeats(audioBuffer);
                        
                        // Shift beat markers by the clip's start time on timeline
                        const shiftedBeats = rawBeats.map(b => b + musicClip.startTime);
                        
                        setBeatMarkers(shiftedBeats);
                        ctx.close();
                    } catch (e) {
                        console.error("Beat detection failed", e);
                    } finally {
                        setIsProcessingAudio(false);
                    }
                };
                runAnalysis();
            }
        } else {
            // Clear beats if music removed
            if (beatMarkers.length > 0) setBeatMarkers([]);
        }
    }, [clips, assets, beatMarkers.length, isProcessingAudio, analyzeBeats]);

    // --- Snap Logic ---
    const handleSmartClipUpdate = useCallback((id: string, changes: Partial<TimelineClip>) => {
        let newChanges = { ...changes };

        // Only snap if we are moving time (start time)
        if (newChanges.startTime !== undefined && snapEnabled && beatMarkers.length > 0) {
            const SNAP_PIXEL_THRESHOLD = 10; // 10px snap range
            const snapTimeThreshold = SNAP_PIXEL_THRESHOLD / zoomLevel;

            let bestTime = newChanges.startTime;
            let minDiff = Infinity;

            for (const beat of beatMarkers) {
                const diff = Math.abs(newChanges.startTime - beat);
                if (diff < snapTimeThreshold && diff < minDiff) {
                    minDiff = diff;
                    bestTime = beat;
                }
            }

            if (minDiff < snapTimeThreshold) {
                newChanges.startTime = bestTime;
            }
        }
        
        onClipUpdate(id, newChanges);
    }, [onClipUpdate, snapEnabled, beatMarkers, zoomLevel]);

    // ... (Auto Montage & Caption logic remains largely the same but could use worker if updated similarly) ...
    // Note: handleAutoMontage uses `generateBeatSyncedSequence` which currently uses the main-thread service.
    // Ideally we'd update that too, but keeping scope focused on Timeline.tsx direct logic first.

    const handleAutoMontage = async () => {
        const musicClip = clips.find(c => c.trackId === 'audio_music');
        if (!musicClip) {
            alert("No music track found on timeline.");
            return;
        }

        const musicAsset = assets.find(a => a.id === String(musicClip.resourceId));
        if (!musicAsset || !musicAsset.data) {
            alert("Music asset not found.");
            return;
        }

        const videoAssets = assets.filter(a => a.type === 'video');
        if (videoAssets.length === 0) {
            alert("No video assets found.");
            return;
        }

        setIsMontaging(true);

        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const audioBuffer = await decodeAudioData(decode(musicAsset.data), ctx, 44100, 1);

            // Refactor montage service to use our worker-based analysis?
            // For now, let's keep the existing service call but note it might block slightly.
            // Requirement was specifically beat/silence detection in Timeline. 
            // `generateBeatSyncedSequence` calls `detectBeats`. We should ideally pass the beats we already calculated!
            
            // Optimization: If we have beats, use them.
            // But `generateBeatSyncedSequence` is a service function. 
            // We'll rely on the service for now to avoid extensive refactor of services.
            
            const newSequence = await generateBeatSyncedSequence(audioBuffer, videoAssets);
            
            const shiftedSequence = newSequence.map(clip => ({
                ...clip,
                startTime: clip.startTime + musicClip.startTime
            }));

            const otherClips = sbTimeline.clips.filter(c => c.trackId !== 'video_main');
            
            useAppStore.setState(state => ({
                sbTimeline: {
                    ...state.sbTimeline,
                    clips: [...otherClips, ...shiftedSequence]
                }
            }));
            
            ctx.close();

        } catch (e) {
            console.error("Montage failed", e);
        } finally {
            setIsMontaging(false);
        }
    };
    
    // --- Auto Caption Logic ---
    const handleAutoCaption = async () => {
        const dialogueClips = clips.filter(c => c.trackId === 'audio_dialogue');
        if (dialogueClips.length === 0) {
            alert("No dialogue audio found.");
            return;
        }

        setIsCaptioning(true);
        try {
            const newCaptionClips: TimelineClip[] = [];
            for (const clip of dialogueClips) {
                const asset = assets.find(a => a.id === String(clip.resourceId));
                if (!asset || !asset.data) continue;

                const byteCharacters = atob(asset.data);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: asset.mimeType });

                const captions = await geminiService.transcribeAudio(blob);

                captions.forEach(cap => {
                    const relStart = cap.startTime - clip.offset;
                    const relEnd = cap.endTime - clip.offset;
                    if (relEnd > 0 && relStart < clip.duration) {
                         const start = Math.max(0, relStart) + clip.startTime;
                         const end = Math.min(clip.duration, relEnd) + clip.startTime;
                         const newClip: TimelineClip = {
                             id: cap.id,
                             resourceId: 'text_generated',
                             trackId: 'text_main',
                             startTime: start,
                             duration: end - start,
                             offset: 0,
                             type: 'text',
                             label: cap.text,
                             caption: { ...cap, style: 'pop' }
                         };
                         newCaptionClips.push(newClip);
                    }
                });
            }
            
            const otherClips = sbTimeline.clips.filter(c => c.trackId !== 'text_main');
            useAppStore.setState(state => ({
                sbTimeline: { ...state.sbTimeline, clips: [...otherClips, ...newCaptionClips] }
            }));
        } catch (e) {
            console.error("Captioning failed", e);
        } finally {
            setIsCaptioning(false);
        }
    };

    const handleAutoFill = async () => {
        // ... (Auto-Fill logic preserved from previous implementation, omitted for brevity as unchanged) ...
        const dialogueClips = clips.filter(c => c.trackId === 'audio_dialogue');
        let fullScript = "";
        if (dialogueClips.length > 0) {
            dialogueClips.sort((a,b) => a.startTime - b.startTime).forEach(clip => {
                const shot = sbShots.find(s => s.id === clip.resourceId);
                if (shot && shot.dialogueText) fullScript += shot.dialogueText + " ";
            });
        }
        if (!fullScript.trim()) fullScript = sbShots.map(s => s.dialogueText || "").join(" ");
        if (!fullScript.trim()) {
            const userScript = prompt("No script found on timeline. Paste script to auto-fill B-Roll:");
            if (userScript) fullScript = userScript;
            else return;
        }

        setIsAutoFilling(true);
        try {
            const visualSegments = await geminiService.extractVisualKeywords(fullScript);
            if (visualSegments.length === 0) {
                alert("No visualizable concepts found.");
                return;
            }
            for (const segment of visualSegments) {
                const { keyword, time, duration } = segment;
                const timestamp = Date.now();
                const tempAssetId = `ghost_${timestamp}`;
                
                const ghostAsset: Asset = { id: tempAssetId, type: 'video', name: `B-Roll: ${keyword}`, url: '', data: '', mimeType: 'video/mp4' };
                addAsset(ghostAsset);

                const ghostClipId = `clip_${tempAssetId}`;
                addTimelineClip({
                    id: ghostClipId, resourceId: tempAssetId, trackId: 'video_main',
                    startTime: time, duration: duration, offset: 0, type: 'video',
                    label: `Generating: ${keyword}...`, isLoading: true
                });

                let videoUrl = '';
                try {
                    const stockResults = await stockMediaService.searchStockVideo(keyword);
                    if (stockResults.length > 0) videoUrl = stockResults[0].url;
                } catch (e) {}

                if (!videoUrl) {
                    try {
                        const taskId = await startVideoGeneration(keyword, { aspectRatio: '16:9', resolution: '720p', veoModel: 'fast', count: 1 });
                        let attempts = 0;
                        while(!videoUrl && attempts < 60) {
                            await new Promise(r => setTimeout(r, 2000));
                            updateTimelineClip(ghostClipId, { label: `Rendering: ${keyword}` });
                            break;
                        }
                    } catch (e) {
                        updateTimelineClip(ghostClipId, { label: `Failed: ${keyword}`, isLoading: false });
                    }
                }

                if (videoUrl) {
                    const realAssetId = `asset_${Date.now()}_${Math.random()}`;
                    const realAsset: Asset = { id: realAssetId, type: 'video', name: keyword, url: videoUrl, data: '', mimeType: 'video/mp4' };
                    addAsset(realAsset);
                    updateTimelineClip(ghostClipId, { resourceId: realAssetId, label: keyword, isLoading: false });
                }
            }
        } catch (e) {
            console.error(e);
            alert("Auto-Fill failed.");
        } finally {
            setIsAutoFilling(false);
        }
    };

    // --- Smart Cut Logic (Worker Optimized) ---
     const handleSmartCut = async () => {
        setShowSmartCutConfig(false);
        setIsSmartCutting(true);

        try {
            // 1. Identify Target Clips (Dialogue Track)
            const targetClips = clips.filter(c => c.trackId === 'audio_dialogue' || c.trackId === 'video_main');
            
            if (targetClips.length === 0) {
                alert("No clips found on Dialogue or Video tracks.");
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

                // 2. Decode Audio (Main Thread)
                const audioBuffer = await decodeAudioData(decode(asset.data), ctx, 44100, 1);

                // 3. Detect Silence (Worker)
                // Use the hook instead of direct service call
                const silenceRanges = await analyzeSilence(audioBuffer, scThreshold, scMinDuration);

                if (silenceRanges.length > 0) {
                    // 4. Generate New Clips
                    const choppedClips = applySmartCut(clip, silenceRanges);
                    clipIdsToRemove.push(clip.id);
                    newClipsToAdd.push(...choppedClips);
                }
            }
            ctx.close();

            // 5. Update Store
            if (newClipsToAdd.length > 0) {
                const currentTimeline = useAppStore.getState().sbTimeline;
                let updatedClips = currentTimeline.clips.filter(c => !clipIdsToRemove.includes(c.id));
                updatedClips = [...updatedClips, ...newClipsToAdd];
                
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
                    {onRecordToggle && (
                        <button onClick={onRecordToggle} className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold transition-all ${isRecording ? 'bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse' : 'text-slate-400 hover:text-red-400 hover:bg-slate-800'}`}>
                            <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 rounded-sm' : 'bg-current'}`} />
                            {isRecording ? 'REC' : 'ADR'}
                        </button>
                    )}
                    <div className="h-4 w-px bg-slate-700 mx-1" />
                    
                    <button onClick={handleAutoMontage} disabled={isMontaging} className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-bold transition-all border ${isMontaging ? 'bg-yellow-900/30 border-yellow-500/50 text-yellow-400 animate-pulse' : 'bg-slate-800 border-slate-600 text-yellow-400 hover:bg-slate-700'}`}>
                        {isMontaging ? <Icon name="spinner" className="w-3.5 h-3.5 animate-spin" /> : <Icon name="zap" className="w-3.5 h-3.5" />} Auto-Edit
                    </button>

                     <button onClick={handleAutoCaption} disabled={isCaptioning} className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-bold transition-all border ${isCaptioning ? 'bg-cyan-900/30 border-cyan-500/50 text-cyan-400 animate-pulse' : 'bg-slate-800 border-slate-600 text-cyan-400 hover:bg-slate-700'}`}>
                        {isCaptioning ? <Icon name="spinner" className="w-3.5 h-3.5 animate-spin" /> : <Icon name="subtitles" className="w-3.5 h-3.5" />} Captions
                    </button>

                    <button onClick={handleAutoFill} disabled={isAutoFilling} className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-bold transition-all border ${isAutoFilling ? 'bg-fuchsia-900/30 border-fuchsia-500/50 text-fuchsia-400 animate-pulse' : 'bg-slate-800 border-slate-600 text-fuchsia-400 hover:bg-slate-700'}`}>
                        {isAutoFilling ? <Icon name="spinner" className="w-3.5 h-3.5 animate-spin" /> : <Icon name="magic" className="w-3.5 h-3.5" />} Auto-Fill
                    </button>

                    <div className="h-4 w-px bg-slate-700 mx-1" />
                    
                    <button onClick={() => setSnapEnabled(!snapEnabled)} className={`text-xs flex items-center gap-1 px-2 py-1 rounded transition-colors ${snapEnabled ? 'text-cyan-400 bg-cyan-900/20' : 'text-slate-500 hover:text-slate-300'}`}>
                        <Icon name="activity" className="w-3.5 h-3.5" /> Snap
                    </button>

                    <div className="relative">
                        <button onClick={() => setShowSmartCutConfig(!showSmartCutConfig)} disabled={isSmartCutting} className={`text-xs flex items-center gap-1 px-2 py-1 rounded transition-colors ${isSmartCutting ? 'text-cyan-400 bg-cyan-900/20 animate-pulse' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                            <Icon name={isSmartCutting ? "spinner" : "scissors"} className={`w-3.5 h-3.5 ${isSmartCutting ? 'animate-spin' : ''}`} /> Auto-Cut
                        </button>
                        
                        {showSmartCutConfig && (
                            <div className="absolute top-full left-0 mt-2 bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-2xl z-50 w-64 animate-fade-in-up">
                                <h4 className="text-xs font-bold text-slate-300 uppercase mb-3">Silence Removal</h4>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-[10px] text-slate-400 block mb-1">Threshold: {scThreshold}dB</label>
                                        <input type="range" min="-60" max="0" step="1" value={scThreshold} onChange={(e) => setScThreshold(parseInt(e.target.value))} className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-slate-400 block mb-1">Min Pause: {scMinDuration}s</label>
                                        <input type="range" min="0.1" max="2.0" step="0.1" value={scMinDuration} onChange={(e) => setScMinDuration(parseFloat(e.target.value))} className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer" />
                                    </div>
                                    <button onClick={handleSmartCut} className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold mt-2">Apply Cut</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isProcessingAudio && <span className="text-[9px] text-fuchsia-400 animate-pulse mr-2">Processing Audio (Worker)...</span>}
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
                            zoomLevel={zoomLevel} duration={duration + 10} onClipUpdate={handleSmartClipUpdate}
                            beatMarkers={snapEnabled ? beatMarkers : undefined}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Timeline;
