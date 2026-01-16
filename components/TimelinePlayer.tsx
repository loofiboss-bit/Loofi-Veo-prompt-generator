
import React, { useState, useEffect, useRef } from 'react';
import { Shot, VideoFilters, CropConfig, TextOverlay, Asset, TimelineClip } from '../types';
import Icon from './Icon';
import { stitchVideos, transcodeVideo } from '../services/videoEditorService';
import FilterControls from './FilterControls';
import AudioMixer from './AudioMixer';
import VFXPanel from './VFXPanel';
import { useHotkeys } from '../hooks/useHotkeys';
import SocialCropModal from './SocialCropModal';
import ExportModal from './ExportModal';
import { ExportProfile } from '../config/exportProfiles';
import { useAppStore } from '../store/useAppStore';
import { generateFCPXML } from '../utils/xmlExport';
import JSZip from 'jszip';
import AmbienceStudio from './AmbienceStudio';
import Timeline from './Timeline/Timeline'; 

interface TimelinePlayerProps {
    shots: Shot[];
    onClose: () => void;
    bgMusicUrl?: string | null;
    ambienceUrl?: string | null;
}

const TimelinePlayer: React.FC<TimelinePlayerProps> = ({ shots, onClose, bgMusicUrl, ambienceUrl }) => {
    // Filter shots to only include those with videos
    const playlist = React.useMemo(() => shots.filter(s => s.generatedVideoUrl), [shots]);
    
    const { sbTimeline, syncTimelineFromShots, updateTimelineClip, addAsset, addTimelineClip } = useAppStore();

    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    
    // Proxy Mode State
    const [useProxy, setUseProxy] = useState(true);
    
    // Export State
    const [isExporting, setIsExporting] = useState(false);
    const [exportStatus, setExportStatus] = useState('');
    const [showExportModal, setShowExportModal] = useState(false);

    // Global Filter State
    const [filters, setFilters] = useState<VideoFilters>({
        contrast: 100,
        saturation: 100,
        sepia: 0,
        grain: 0,
        vfxType: 'none',
        vfxIntensity: 50
    });
    const [showFilters, setShowFilters] = useState(false);
    
    // Audio Mixer State
    const [audioMix, setAudioMix] = useState({ dialogue: 1.0, sfx: 1.0, music: 0.5, ambience: 0.15 });
    const [autoDuck, setAutoDuck] = useState(true);
    const [showMixer, setShowMixer] = useState(false);
    
    // Recording / ADR State
    const [isRecording, setIsRecording] = useState(false);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [muteForDubbing, setMuteForDubbing] = useState(true);
    
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingStartTimeRef = useRef<number>(0);

    // Overlay State
    const [activeOverlays, setActiveOverlays] = useState<TextOverlay[]>([]);
    const [overlayStates, setOverlayStates] = useState<Record<string, 'in' | 'visible' | 'out'>>({});

    const videoRef = useRef<HTMLVideoElement>(null);
    const bgVideoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const musicRef = useRef<HTMLAudioElement>(null);
    const ambienceRef = useRef<HTMLAudioElement>(null); 
    
    const lastTimeRef = useRef<number>(0);
    const rafIdRef = useRef<number | null>(null);

    // Calculate total duration for timeline
    const totalDuration = playlist.reduce((acc, shot) => acc + (shot.duration || 5), 0);

    const currentShot = playlist[currentIndex];
    
    // --- PROXY LOGIC ---
    const highResSrc = (currentShot?.takes && typeof currentShot?.selectedTakeIndex === 'number' && currentShot.takes[currentShot.selectedTakeIndex]) 
        ? currentShot.takes[currentShot.selectedTakeIndex] 
        : currentShot?.generatedVideoUrl;

    const activeVideoSrc = (useProxy && currentShot?.proxyVideoUrl) 
        ? currentShot.proxyVideoUrl 
        : highResSrc;
    
    const isGreenScreen = currentShot?.isGreenScreen;
    const bgUrl = currentShot?.backgroundLayerUrl;

    // Sync timeline data on mount
    useEffect(() => {
        syncTimelineFromShots();
    }, [playlist.length]);

    const togglePlay = () => {
        if (isRecording || countdown !== null) return; // Disable manual toggle during recording

        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
                bgVideoRef.current?.pause();
                audioRef.current?.pause();
                musicRef.current?.pause();
                ambienceRef.current?.pause();
            } else {
                videoRef.current.play();
                bgVideoRef.current?.play();
                if (currentShot?.audioUrl && audioRef.current?.src) {
                    audioRef.current.play().catch(e => console.warn("Audio play blocked", e));
                }
                musicRef.current?.play().catch(e => console.warn("Music play blocked", e));
                ambienceRef.current?.play().catch(e => console.warn("Ambience play blocked", e));
            }
            setIsPlaying(!isPlaying);
        }
    };

    const nextClip = () => {
        if (currentIndex < playlist.length - 1) setCurrentIndex(currentIndex + 1);
    };

    const prevClip = () => {
        if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
    };

    // Hotkeys Integration
    useHotkeys({
        "SPACE": togglePlay,
        "ARROWLEFT": prevClip,
        "ARROWRIGHT": nextClip,
        "ESC": onClose
    });

    // --- ADR / RECORDING LOGIC ---
    const startADR = async () => {
        if (isRecording || countdown !== null) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Start Countdown
            setIsPlaying(false);
            setCountdown(3);
            
            let count = 3;
            const timer = setInterval(() => {
                count--;
                if (count > 0) {
                    setCountdown(count);
                } else {
                    clearInterval(timer);
                    setCountdown(null);
                    beginRecordingSession(stream);
                }
            }, 1000);

        } catch (err) {
            console.error("Microphone access denied", err);
            alert("Microphone permission required for dubbing.");
        }
    };

    const beginRecordingSession = (stream: MediaStream) => {
        recordingStartTimeRef.current = sbTimeline.currentTime;
        audioChunksRef.current = [];

        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                audioChunksRef.current.push(e.data);
            }
        };

        recorder.onstop = () => {
            stream.getTracks().forEach(track => track.stop());
            finalizeRecording();
        };

        recorder.start();
        setIsRecording(true);
        setIsPlaying(true);
        
        // Start Playback
        if (videoRef.current) {
            videoRef.current.play();
            // Optional: Mute monitors during recording to prevent bleed
            if (muteForDubbing) {
                if (audioRef.current) audioRef.current.muted = true;
                if (musicRef.current) musicRef.current.muted = true;
                if (ambienceRef.current) ambienceRef.current.muted = true;
            }
        }
    };

    const stopADR = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setIsPlaying(false);
            
            if (videoRef.current) videoRef.current.pause();
            
            // Unmute
            if (audioRef.current) audioRef.current.muted = false;
            if (musicRef.current) musicRef.current.muted = false;
            if (ambienceRef.current) ambienceRef.current.muted = false;
        }
    };

    const finalizeRecording = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const reader = new FileReader();
        
        reader.onloadend = () => {
            const base64data = (reader.result as string).split(',')[1];
            
            // 1. Create Asset
            const assetId = `adr_${Date.now()}`;
            const newAsset: Asset = {
                id: assetId,
                type: 'audio',
                name: `Dub Take ${new Date().toLocaleTimeString()}`,
                url: audioUrl,
                data: base64data,
                mimeType: 'audio/webm'
            };
            addAsset(newAsset);

            // 2. Create Timeline Clip
            const duration = (sbTimeline.currentTime - recordingStartTimeRef.current);
            const newClip: TimelineClip = {
                id: `clip_${assetId}`,
                resourceId: assetId, // Refers to the Asset, not a Shot ID
                trackId: 'audio_dialogue', // Default to dialogue track
                startTime: recordingStartTimeRef.current,
                duration: Math.max(0.5, duration),
                offset: 0,
                type: 'audio',
                label: 'Voice Over (Rec)'
            };
            addTimelineClip(newClip);
        };
        reader.readAsDataURL(audioBlob);
    };

    useEffect(() => {
        lastTimeRef.current = 0;
        setIsPlaying(true);
        setActiveOverlays([]);
        setOverlayStates({});
        
        // Reset Voice Track
        if (audioRef.current) {
            audioRef.current.pause();
            if (currentShot?.audioUrl) {
                audioRef.current.src = currentShot.audioUrl;
                audioRef.current.volume = Math.min(1, (currentShot.audioVolume ?? 1.0) * audioMix.dialogue);
                audioRef.current.currentTime = 0;
            } else {
                audioRef.current.src = "";
            }
        }

        // Handle Music Track
        if (musicRef.current && isPlaying && musicRef.current.paused && bgMusicUrl) {
             musicRef.current.play().catch(e => console.warn("Music autoplay blocked", e));
        }
        
        // Handle Ambience Track
        if (ambienceRef.current && isPlaying && ambienceRef.current.paused && ambienceUrl) {
             ambienceRef.current.volume = audioMix.ambience;
             ambienceRef.current.play().catch(e => console.warn("Ambience autoplay blocked", e));
        }

    }, [currentIndex, playlist]);

    // Chroma Key Processing Loop
    useEffect(() => {
        if (!isGreenScreen || !canvasRef.current || !videoRef.current) {
            if (rafIdRef.current) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }
            return;
        }

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const video = videoRef.current;

        const processFrame = () => {
            if (ctx && video.readyState === 4) {
                if (canvas.width !== video.videoWidth) {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                }

                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const l = frame.data.length / 4;

                for (let i = 0; i < l; i++) {
                    const r = frame.data[i * 4 + 0];
                    const g = frame.data[i * 4 + 1];
                    const b = frame.data[i * 4 + 2];
                    
                    if (g > 90 && g > (r * 1.4) && g > (b * 1.4)) {
                         frame.data[i * 4 + 3] = 0; 
                    }
                }
                ctx.putImageData(frame, 0, 0);
            }

            if (isPlaying) {
                rafIdRef.current = requestAnimationFrame(processFrame);
            }
        };

        if (isPlaying) {
            rafIdRef.current = requestAnimationFrame(processFrame);
        } else {
            processFrame();
        }

        return () => {
            if (rafIdRef.current) {
                cancelAnimationFrame(rafIdRef.current);
            }
        };
    }, [isGreenScreen, isPlaying, activeVideoSrc]); 

    // Update volumes in real-time
    useEffect(() => {
        if (audioRef.current && !audioRef.current.muted) {
            audioRef.current.volume = Math.min(1, (currentShot?.audioVolume ?? 1.0) * audioMix.dialogue);
        }
        if (ambienceRef.current && !ambienceRef.current.muted) {
            ambienceRef.current.volume = audioMix.ambience;
        }
    }, [audioMix.dialogue, audioMix.ambience, currentShot]);

    const handleVideoPlay = () => {
        if (currentShot?.audioUrl && audioRef.current) {
            audioRef.current.play().catch(e => console.log("Audio play failed (interaction needed)", e));
        }
        bgVideoRef.current?.play();
        musicRef.current?.play();
        ambienceRef.current?.play();
    };

    const handleVideoPause = () => {
        audioRef.current?.pause();
        bgVideoRef.current?.pause();
        musicRef.current?.pause();
        ambienceRef.current?.pause();
    };

    const handleEnded = () => {
        if (currentIndex < playlist.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            if (isRecording) {
                stopADR(); // Stop recording if timeline ends
            } else {
                setIsPlaying(false);
                audioRef.current?.pause();
                bgVideoRef.current?.pause();
                musicRef.current?.pause();
                ambienceRef.current?.pause();
            }
        }
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            const currentTime = videoRef.current.currentTime;
            
            // Calculate Global Time based on clips before
            let globalTime = 0;
            for (let i = 0; i < currentIndex; i++) {
                globalTime += playlist[i].duration || 5;
            }
            globalTime += currentTime;

            // Sync Store for Timeline Visualization
            useAppStore.setState(state => ({ 
                sbTimeline: { ...state.sbTimeline, currentTime: globalTime } 
            }));
            
            // --- Overlay Update ---
            if (currentShot?.overlays) {
                const active = currentShot.overlays.filter(o => 
                    currentTime >= o.startTime && currentTime < (o.startTime + o.duration)
                );
                
                const newStates: Record<string, 'in' | 'visible' | 'out'> = {};
                
                active.forEach(overlay => {
                    const animDur = overlay.animationDuration || 0.5;
                    const timeSinceStart = currentTime - overlay.startTime;
                    const timeUntilEnd = (overlay.startTime + overlay.duration) - currentTime;
                    
                    if (timeSinceStart < animDur) {
                        newStates[overlay.id] = 'in';
                    } else if (timeUntilEnd < animDur) {
                        newStates[overlay.id] = 'out';
                    } else {
                        newStates[overlay.id] = 'visible';
                    }
                });
                
                setOverlayStates(newStates);
                setActiveOverlays(active);
            }

            if (bgVideoRef.current && Math.abs(bgVideoRef.current.currentTime - currentTime) > 0.5) {
                bgVideoRef.current.currentTime = currentTime;
            }

            if (audioRef.current && !audioRef.current.paused && audioRef.current.src) {
                const diff = Math.abs(audioRef.current.currentTime - currentTime);
                if (diff > 0.3) {
                    audioRef.current.currentTime = currentTime;
                }
            }

            // --- AUDIO DUCKING ---
            if (musicRef.current && !musicRef.current.muted) {
                const voiceIsActive = audioRef.current && !audioRef.current.paused && !audioRef.current.ended && audioRef.current.src;
                const duckingMultiplier = (autoDuck && voiceIsActive) ? 0.3 : 1.0;
                const targetVolume = Math.min(1, audioMix.music * duckingMultiplier);
                
                const currentVolume = musicRef.current.volume;
                if (Math.abs(currentVolume - targetVolume) > 0.01) {
                    musicRef.current.volume += (targetVolume - currentVolume) * 0.05;
                } else {
                    musicRef.current.volume = targetVolume;
                }
            }

            lastTimeRef.current = currentTime;
        }
    };

    // Handle seeking from Timeline component
    const handleGlobalSeek = (time: number) => {
        if (isRecording) return; // Disable seek during recording

        // Find which clip contains this time
        let accumulatedTime = 0;
        let foundIndex = -1;
        let localTime = 0;

        for (let i = 0; i < playlist.length; i++) {
            const dur = playlist[i].duration || 5;
            if (time >= accumulatedTime && time < accumulatedTime + dur) {
                foundIndex = i;
                localTime = time - accumulatedTime;
                break;
            }
            accumulatedTime += dur;
        }

        if (foundIndex !== -1) {
            if (foundIndex !== currentIndex) {
                setCurrentIndex(foundIndex);
            } else {
                if (videoRef.current) {
                    videoRef.current.currentTime = localTime;
                }
            }
            useAppStore.setState(state => ({ 
                sbTimeline: { ...state.sbTimeline, currentTime: time } 
            }));
        }
    };

    const handleConfirmExport = (profile: ExportProfile) => {
        // Prepare clips for stitching using HIGH-RES source URLs
        const exportClips = playlist.map(s => ({
            videoUrl: (s.takes && typeof s.selectedTakeIndex === 'number' && s.takes[s.selectedTakeIndex]) ? s.takes[s.selectedTakeIndex] : (s.generatedVideoUrl || ''),
            audioUrl: s.audioUrl,
            audioVolume: s.audioVolume,
            dialogueText: s.dialogueText,
            transitionToNext: s.transitionToNext,
            overlays: s.overlays,
            colorGrade: s.colorGrade
        })).filter(c => c.videoUrl !== '');

        setIsExporting(true);
        setExportStatus("Starting Export...");
        
        stitchVideos(
            exportClips,
            'export_master.mp4',
            (msg) => setExportStatus(msg),
            filters,
            undefined, // cropConfig not supported in this simple flow
            bgMusicUrl,
            { volumes: { dialogue: audioMix.dialogue, music: audioMix.music }, autoDuck }
        ).then(url => {
            const link = document.createElement('a');
            link.href = url;
            link.download = `Veo_Export_${Date.now()}.${profile.container === 'gif' ? 'gif' : 'mp4'}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setIsExporting(false);
            setShowExportModal(false);
        }).catch(err => {
            console.error(err);
            setExportStatus("Export Failed");
            setTimeout(() => {
                setIsExporting(false);
                setShowExportModal(false);
            }, 2000);
        });
    };

    const handleFilterChange = (key: keyof VideoFilters, value: any) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleFilterReset = () => {
        setFilters({ contrast: 100, saturation: 100, sepia: 0, grain: 0, vfxType: 'none', vfxIntensity: 50 });
    };

    const handleAudioMixChange = (key: 'dialogue' | 'sfx' | 'music' | 'ambience', value: number) => {
        setAudioMix(prev => ({ ...prev, [key]: value }));
    };

    const handleMixerReset = () => {
        setAudioMix({ dialogue: 1.0, sfx: 1.0, music: 0.5, ambience: 0.15 });
        setAutoDuck(true);
    };

    if (playlist.length === 0) {
        return (
            <div className="fixed inset-0 bg-black/95 z-[100] flex flex-col items-center justify-center text-slate-400">
                <Icon name="video" className="w-16 h-16 mb-4 opacity-50" />
                <p>No video clips found in this sequence.</p>
                <button onClick={onClose} className="mt-6 px-6 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 text-white">Close</button>
            </div>
        );
    }

    const videoStyle = {
        filter: `contrast(${filters.contrast}%) saturate(${filters.saturation}%) sepia(${filters.sepia}%)`
    };

    return (
        <div className="fixed inset-0 bg-black z-[100] flex flex-col animate-fade-in-up">
            <audio ref={audioRef} />
            {bgMusicUrl && <audio ref={musicRef} src={bgMusicUrl} loop />}
            {ambienceUrl && <audio ref={ambienceRef} src={ambienceUrl} loop />}

            {/* Header Overlay */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20 bg-gradient-to-b from-black/80 to-transparent pointer-events-none h-20">
                <div className="pointer-events-auto">
                    <h2 className="text-white font-bold text-lg drop-shadow-md">NLE Timeline</h2>
                    <p className="text-slate-300 text-xs drop-shadow-md">
                        Clip {currentIndex + 1} of {playlist.length}
                    </p>
                </div>
                <div className="flex gap-3 pointer-events-auto">
                    {/* Proxy Toggle */}
                    <button 
                        onClick={() => setUseProxy(!useProxy)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                            useProxy 
                            ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400 shadow-lg shadow-yellow-500/20' 
                            : 'bg-slate-800/50 border-slate-600 text-slate-400 hover:bg-slate-700'
                        }`}
                        title="Use lightweight proxy files for smoother playback (Recommended)"
                    >
                        <Icon name="activity" className="w-3 h-3" />
                        <span>{useProxy ? 'Proxy ON' : 'Proxy OFF'}</span>
                    </button>

                    <div className="w-px h-6 bg-white/20 mx-2"></div>

                    <button 
                        onClick={() => setShowExportModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-full text-xs shadow-lg"
                    >
                        <Icon name="download" className="w-4 h-4" />
                        Export
                    </button>
                    <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-sm transition-colors">
                        <Icon name="cancel" className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Overlays (Filters, VFX, Mixer) */}
            {showFilters && (
                <div className="absolute top-24 right-16 z-30 animate-fade-in-up origin-top-right">
                    <FilterControls filters={filters} onChange={handleFilterChange} onReset={handleFilterReset} />
                </div>
            )}
            
            {/* Main Player Area (Preview Monitor) */}
            <div className="flex-grow flex items-center justify-center relative bg-slate-920 overflow-hidden border-b border-slate-800" style={{ height: '60%' }}>
                <div className="relative max-h-full max-w-full aspect-video shadow-2xl flex items-center justify-center w-full h-full bg-black">
                    
                    {/* Background Layer (Green Screen Mode) */}
                    {isGreenScreen && bgUrl && (
                        <video 
                            ref={bgVideoRef} 
                            src={bgUrl} 
                            className="absolute inset-0 w-full h-full object-contain -z-10"
                            muted 
                            loop
                            style={videoStyle}
                        />
                    )}

                    {/* Main Video Source */}
                    <video
                        key={activeVideoSrc}
                        ref={videoRef}
                        src={activeVideoSrc}
                        className={isGreenScreen ? "hidden" : "max-h-full max-w-full block h-full"}
                        style={videoStyle}
                        autoPlay
                        onEnded={handleEnded}
                        onTimeUpdate={handleTimeUpdate}
                        onClick={togglePlay}
                        onPlay={handleVideoPlay}
                        onPause={handleVideoPause}
                        crossOrigin="anonymous"
                    />

                    {/* Canvas for Compositing */}
                    <canvas 
                        ref={canvasRef}
                        className={isGreenScreen ? "max-h-full max-w-full block h-full" : "hidden"}
                        style={videoStyle}
                        onClick={togglePlay}
                    />
                    
                    {/* Recording Overlay */}
                    {(countdown !== null || isRecording) && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none bg-black/20">
                            {countdown !== null ? (
                                <div className="text-[120px] font-bold text-white animate-ping drop-shadow-lg font-mono">
                                    {countdown}
                                </div>
                            ) : (
                                <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600/80 px-4 py-2 rounded-full text-white font-bold animate-pulse">
                                    <div className="w-3 h-3 bg-white rounded-full"></div>
                                    REC
                                </div>
                            )}
                            {isRecording && (
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-4 py-1 rounded-full text-xs backdrop-blur-sm">
                                    Click Stop to Finish
                                </div>
                            )}
                        </div>
                    )}
                    
                    {/* Play/Pause Overlay Icon */}
                    {!isPlaying && countdown === null && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/10 pointer-events-none z-10">
                            <div className="p-4 bg-white/10 rounded-full backdrop-blur-md">
                                <Icon name="play" className="w-12 h-12 text-white" />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom: Timeline Editor */}
            <div className="h-[40%] bg-slate-900 border-t border-slate-800 flex flex-col z-20 relative">
                {/* Tools Bar */}
                <div className="h-10 bg-slate-850 flex items-center px-4 border-b border-slate-700 justify-between">
                    <div className="flex gap-2">
                        <button onClick={togglePlay} className="text-white hover:text-cyan-400">
                            <Icon name={isPlaying ? 'spinner' : 'play'} className="w-5 h-5" />
                        </button>
                        <button onClick={isRecording ? stopADR : startADR} className={`text-white transition-colors ${isRecording ? 'text-red-500 animate-pulse' : 'hover:text-red-400'}`} title="Dubbing (ADR)">
                            <div className={`w-5 h-5 border-2 rounded-full flex items-center justify-center ${isRecording ? 'border-red-500' : 'border-current'}`}>
                                <div className={`w-3 h-3 bg-current ${isRecording ? 'rounded-sm' : 'rounded-full'}`}></div>
                            </div>
                        </button>
                        <div className="w-px h-4 bg-slate-700 mx-1"></div>
                        <button onClick={prevClip} className="text-slate-400 hover:text-white">
                            <Icon name="chevron-down" className="w-5 h-5 rotate-90" />
                        </button>
                        <button onClick={nextClip} className="text-slate-400 hover:text-white">
                            <Icon name="chevron-down" className="w-5 h-5 -rotate-90" />
                        </button>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={() => setShowFilters(!showFilters)} className={`text-xs flex gap-1 ${showFilters ? 'text-cyan-400' : 'text-slate-400'}`}>
                            <Icon name="sliders" className="w-4 h-4" /> Color
                        </button>
                        <button onClick={() => setShowMixer(!showMixer)} className={`text-xs flex gap-1 ${showMixer ? 'text-cyan-400' : 'text-slate-400'}`}>
                            <Icon name="audio" className="w-4 h-4" /> Mixer
                        </button>
                    </div>
                </div>

                {/* The New Timeline Component */}
                <Timeline 
                    timelineState={sbTimeline}
                    onClipUpdate={updateTimelineClip}
                    onSeek={handleGlobalSeek}
                    duration={totalDuration}
                    isRecording={isRecording}
                    onRecordToggle={isRecording ? stopADR : startADR}
                />
            </div>

            {/* Modals (Export, etc.) */}
            <ExportModal 
                isOpen={showExportModal}
                onClose={() => setShowExportModal(false)}
                onConfirm={handleConfirmExport}
                totalDuration={totalDuration}
                isProcessing={isExporting}
                processingStatus={exportStatus}
            />
            {showMixer && (
                <div className="absolute bottom-[40%] right-4 z-40">
                    <AudioMixer volumes={audioMix} autoDuck={autoDuck} onChange={handleAudioMixChange} onAutoDuckChange={setAutoDuck} onReset={handleMixerReset} />
                </div>
            )}
        </div>
    );
};

export default TimelinePlayer;
