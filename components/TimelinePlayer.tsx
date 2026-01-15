
import React, { useState, useEffect, useRef } from 'react';
import { Shot, VideoFilters, CropConfig, TextOverlay } from '../types';
import Icon from './Icon';
import { stitchVideos, transcodeVideo } from '../services/videoEditorService';
import FilterControls from './FilterControls';
import AudioMixer from './AudioMixer';
import VFXPanel from './VFXPanel';
import { useHotkeys } from '../hooks/useHotkeys';
import SocialCropModal from './SocialCropModal';
import ExportModal from './ExportModal';
import { ExportProfile } from '../config/exportProfiles';

interface TimelinePlayerProps {
    shots: Shot[];
    onClose: () => void;
    bgMusicUrl?: string | null;
}

// 64x64 Noise Pattern Base64 (Tiny transparent png with noise)
const NOISE_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAQAAAAAYLLVAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QA/4ePzL8AAAAJcEhZcwAACxMAAAsTAQCanBgAAAAHdElNRQfmAxoMHSY+q45CAAABxElEQVRo3u2ZPU/CQBCG3/wDBiS+jYn/x8mfiYmJxvjR+DEh0ZgYExMTE41x+TEh8W9Y5x0X7h4tqUe6V3q5vW93793tFvA/x8W/Y98e27b9cOyH7bft12Pbvj22/bH9sX2z/bT9tP2y/bb9sX2zfbV9tf2wfbN9sf2wfbV9sX21fbF9tf2wfbF9sX2x/bD9sH2zfbX9sH2zfbH9sH21fbF9tf2wfbF9sX2x/bB9s321/bB9s32x/bB9tX2xfbX9sH2xfbF9sf2wfbN9tf2wfbN9sf2wfbV9sX21/bB9sX2xfbH9sH2zfbX9sH21fbF9sf2wfbH9sH21/bB9s32x/bB9tX2xfbX9sH2xfbF9sf2wfbN9tf2wfbN9sf2wfbV9sX21/bB9sX2xfbH9sH2zfbX9sH21fbF9sf2wfbH9sH21fbF9sf2wfbN9tf2wfbN9sf2wfbV9sX21/bB9sX2xfbH9sH2zfbX9sH21fbF9sf2x/bD9sH21fbF9sf2x/b/t9/8Ag825R3+3gH8AAAAASUVORK5CYII=";

const TimelinePlayer: React.FC<TimelinePlayerProps> = ({ shots, onClose, bgMusicUrl }) => {
    // Filter shots to only include those with videos
    const playlist = React.useMemo(() => shots.filter(s => s.generatedVideoUrl), [shots]);
    
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const [progress, setProgress] = useState(0);
    
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
    const [showVFX, setShowVFX] = useState(false);
    
    // Audio Mixer State
    const [audioMix, setAudioMix] = useState({ dialogue: 1.0, sfx: 1.0, music: 0.5 });
    const [autoDuck, setAutoDuck] = useState(true);
    const [showMixer, setShowMixer] = useState(false);

    // Captions State
    const [showCaptions, setShowCaptions] = useState(true);

    // Social Crop State
    const [isReframing, setIsReframing] = useState(false);

    // Overlay State
    const [activeOverlays, setActiveOverlays] = useState<TextOverlay[]>([]);
    const [overlayStates, setOverlayStates] = useState<Record<string, 'in' | 'visible' | 'out'>>({});

    const videoRef = useRef<HTMLVideoElement>(null);
    const bgVideoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const musicRef = useRef<HTMLAudioElement>(null);
    
    // SFX References
    const [activeSFX, setActiveSFX] = useState<string[]>([]);
    const lastTimeRef = useRef<number>(0);
    const rafIdRef = useRef<number | null>(null);

    const currentShot = playlist[currentIndex];
    
    const activeVideoSrc = (currentShot.takes && typeof currentShot.selectedTakeIndex === 'number' && currentShot.takes[currentShot.selectedTakeIndex]) 
        ? currentShot.takes[currentShot.selectedTakeIndex] 
        : currentShot.generatedVideoUrl;
    
    const isGreenScreen = currentShot.isGreenScreen;
    const bgUrl = currentShot.backgroundLayerUrl;

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
                bgVideoRef.current?.pause();
                audioRef.current?.pause();
                musicRef.current?.pause();
            } else {
                videoRef.current.play();
                bgVideoRef.current?.play();
                if (currentShot.audioUrl && audioRef.current?.src) {
                    audioRef.current.play().catch(e => console.warn("Audio play blocked", e));
                }
                musicRef.current?.play().catch(e => console.warn("Music play blocked", e));
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

    useEffect(() => {
        setProgress(0);
        lastTimeRef.current = 0;
        setIsPlaying(true);
        setActiveSFX([]);
        setActiveOverlays([]);
        setOverlayStates({});
        
        // Reset Voice Track
        if (audioRef.current) {
            audioRef.current.pause();
            if (currentShot?.audioUrl) {
                audioRef.current.src = currentShot.audioUrl;
                // Apply global Dialogue volume mix here
                audioRef.current.volume = Math.min(1, (currentShot.audioVolume ?? 1.0) * audioMix.dialogue);
                audioRef.current.currentTime = 0;
            } else {
                audioRef.current.src = "";
            }
        }

        // Handle Music Track initial playback on clip change/load
        if (musicRef.current && isPlaying && musicRef.current.paused && bgMusicUrl) {
             musicRef.current.play().catch(e => console.warn("Music autoplay blocked", e));
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
            if (video.paused || video.ended) { }

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

    // Update dialogue volume in real-time if mixer changes
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = Math.min(1, (currentShot.audioVolume ?? 1.0) * audioMix.dialogue);
        }
    }, [audioMix.dialogue]);

    const handleVideoPlay = () => {
        if (currentShot.audioUrl && audioRef.current) {
            audioRef.current.play().catch(e => console.log("Audio play failed (interaction needed)", e));
        }
        bgVideoRef.current?.play();
        musicRef.current?.play();
    };

    const handleVideoPause = () => {
        audioRef.current?.pause();
        bgVideoRef.current?.pause();
        musicRef.current?.pause();
    };

    const handleEnded = () => {
        if (currentIndex < playlist.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            setIsPlaying(false);
            audioRef.current?.pause();
            bgVideoRef.current?.pause();
            musicRef.current?.pause();
        }
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            const currentTime = videoRef.current.currentTime;
            const duration = videoRef.current.duration;
            const pct = (currentTime / duration) * 100;
            setProgress(pct || 0);
            
            // --- Overlay Update ---
            if (currentShot.overlays) {
                // Determine active overlays and their animation state
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

            // --- AUDIO DUCKING & MIXING LOGIC ---
            if (musicRef.current) {
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

            if (currentShot.sfx && currentShot.sfx.length > 0) {
                currentShot.sfx.forEach(sfx => {
                    if (currentTime > lastTimeRef.current) {
                        if (sfx.timestamp >= lastTimeRef.current && sfx.timestamp < currentTime) {
                            const audio = new Audio(sfx.audioUrl);
                            audio.volume = Math.min(1, (currentShot.audioVolume ?? 1.0) * audioMix.sfx);
                            audio.play().catch(e => console.warn("SFX failed to play", e));
                            
                            setActiveSFX(prev => [...prev, sfx.id]);
                            setTimeout(() => {
                                setActiveSFX(prev => prev.filter(id => id !== sfx.id));
                            }, 500);
                        }
                    }
                });
            }
            lastTimeRef.current = currentTime;
        }
    };

    const handleRunExport = async (profile: ExportProfile, cropConfig?: CropConfig) => {
        setIsExporting(true);
        if (videoRef.current) {
            videoRef.current.pause();
            bgVideoRef.current?.pause();
            audioRef.current?.pause();
            musicRef.current?.pause();
            setIsPlaying(false);
        }

        try {
            const clips = playlist.map(s => ({
                videoUrl: (s.takes && typeof s.selectedTakeIndex === 'number' && s.takes[s.selectedTakeIndex]) 
                    ? s.takes[s.selectedTakeIndex] 
                    : s.generatedVideoUrl!,
                audioUrl: s.audioUrl,
                audioVolume: s.audioVolume ?? 1.0,
                dialogueText: showCaptions ? s.dialogueText : undefined,
                transitionToNext: s.transitionToNext,
                overlays: s.overlays 
            }));

            // 1. Stitch video (Intermediate MP4)
            const stitchedUrl = await stitchVideos(
                clips, 
                'intermediate_master.mp4', 
                (status) => setExportStatus(status), 
                filters, 
                cropConfig,
                bgMusicUrl,
                {
                    volumes: { dialogue: audioMix.dialogue, music: audioMix.music },
                    autoDuck: autoDuck
                }
            );

            // 2. Transcode to Target Profile (or pass through if profile matches simple MP4)
            let finalUrl = stitchedUrl;
            
            // If the profile requires specialized transcoding (ProRes, WebM, GIF, or specific h264 settings)
            // we run the transcode step.
            if (profile.id !== 'social_h264') { // Assuming stitchVideos creates a decent H264 by default
                 setExportStatus(`Encoding to ${profile.label}...`);
                 finalUrl = await transcodeVideo(stitchedUrl, profile, (status) => setExportStatus(status));
            }

            const link = document.createElement('a');
            link.href = finalUrl;
            link.download = `veo-export-${Date.now()}.${profile.container}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            if (finalUrl !== stitchedUrl) URL.revokeObjectURL(finalUrl);
            URL.revokeObjectURL(stitchedUrl);

        } catch (error) {
            console.error(error);
            alert("Failed to export movie. See console for details.");
        } finally {
            setIsExporting(false);
            setExportStatus('');
            setShowExportModal(false);
        }
    };

    const handleConfirmExport = (profile: ExportProfile) => {
        handleRunExport(profile);
    };

    const handleReframeExport = (config: CropConfig) => {
        setIsReframing(false);
        // Default to MP4 for social reframe
        // We construct a temporary profile for this or reuse standard social profile
        const socialProfile: ExportProfile = {
            id: 'social_crop',
            label: 'Social Crop',
            description: 'Vertical Cut',
            container: 'mp4',
            videoCodec: 'libx264',
            args: [],
            mimeType: 'video/mp4',
            estimatedBitrateMbps: 8
        };
        handleRunExport(socialProfile, config);
    };

    const handleFilterChange = (key: keyof VideoFilters, value: any) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleFilterReset = () => {
        setFilters({ contrast: 100, saturation: 100, sepia: 0, grain: 0, vfxType: 'none', vfxIntensity: 50 });
    };

    const handleAudioMixChange = (key: 'dialogue' | 'sfx' | 'music', value: number) => {
        setAudioMix(prev => ({ ...prev, [key]: value }));
    };

    const handleMixerReset = () => {
        setAudioMix({ dialogue: 1.0, sfx: 1.0, music: 0.5 });
        setAutoDuck(true);
    };

    // Approximate total duration calculation
    const totalDuration = playlist.reduce((acc, shot) => acc + (shot.duration || 5), 0);

    if (playlist.length === 0) {
        return (
            <div className="fixed inset-0 bg-black/95 z-[100] flex flex-col items-center justify-center text-slate-400">
                <Icon name="video" className="w-16 h-16 mb-4 opacity-50" />
                <p>No video clips found in this sequence.</p>
                <button onClick={onClose} className="mt-6 px-6 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 text-white">Close</button>
            </div>
        );
    }

    const getMarkerLeft = (timestamp: number) => {
        if (!videoRef.current?.duration) return '0%';
        return `${(timestamp / videoRef.current.duration) * 100}%`;
    };

    const videoStyle = {
        filter: `contrast(${filters.contrast}%) saturate(${filters.saturation}%) sepia(${filters.sepia}%)`
    };

    // Helper to determine animation class
    const getAnimationClass = (overlay: TextOverlay, state: 'in' | 'visible' | 'out') => {
        if (state === 'in') {
            switch(overlay.animationIn) {
                case 'fade': return 'animate-veo-fade-in';
                case 'slide_up': return 'animate-veo-slide-up';
                case 'zoom': return 'animate-veo-zoom-in';
                case 'typewriter': return 'animate-veo-typewriter overflow-hidden whitespace-nowrap border-r-2 border-white pr-1';
                default: return '';
            }
        }
        if (state === 'out') {
            switch(overlay.animationOut) {
                case 'fade': return 'animate-veo-fade-out';
                case 'slide_down': return 'animate-veo-slide-down';
                case 'zoom': return 'animate-veo-zoom-out';
                default: return '';
            }
        }
        // Visible state (no animation, just static)
        return '';
    };

    return (
        <div className="fixed inset-0 bg-black z-[100] flex flex-col animate-fade-in-up">
            <style>{`
                @keyframes veo-fade-in { from { opacity: 0; } to { opacity: 1; } }
                @keyframes veo-fade-out { from { opacity: 1; } to { opacity: 0; } }
                @keyframes veo-slide-up { from { transform: translate(-50%, 20px); opacity: 0; } to { transform: translate(-50%, -50%); opacity: 1; } }
                @keyframes veo-slide-down { from { transform: translate(-50%, -50%); opacity: 1; } to { transform: translate(-50%, 20px); opacity: 0; } }
                @keyframes veo-zoom-in { from { transform: translate(-50%, -50%) scale(0.8); opacity: 0; } to { transform: translate(-50%, -50%) scale(1); opacity: 1; } }
                @keyframes veo-zoom-out { from { transform: translate(-50%, -50%) scale(1); opacity: 1; } to { transform: translate(-50%, -50%) scale(0.8); opacity: 0; } }
                @keyframes veo-typewriter { from { width: 0; } to { width: 100%; } }
                
                .animate-veo-fade-in { animation-name: veo-fade-in; animation-fill-mode: forwards; }
                .animate-veo-fade-out { animation-name: veo-fade-out; animation-fill-mode: forwards; }
                .animate-veo-slide-up { animation-name: veo-slide-up; animation-fill-mode: forwards; }
                .animate-veo-slide-down { animation-name: veo-slide-down; animation-fill-mode: forwards; }
                .animate-veo-zoom-in { animation-name: veo-zoom-in; animation-fill-mode: forwards; }
                .animate-veo-zoom-out { animation-name: veo-zoom-out; animation-fill-mode: forwards; }
                .animate-veo-typewriter { animation-name: veo-typewriter; animation-timing-function: steps(40, end); animation-fill-mode: forwards; display: inline-block; vertical-align: bottom; }
            `}</style>

            <audio ref={audioRef} />
            {bgMusicUrl && <audio ref={musicRef} src={bgMusicUrl} loop />}

            {/* Header Overlay */}
            <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-20 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
                <div className="pointer-events-auto">
                    <h2 className="text-white font-bold text-lg drop-shadow-md">Timeline Player</h2>
                    <p className="text-slate-300 text-xs drop-shadow-md">
                        Clip {currentIndex + 1} of {playlist.length} • Shot #{currentShot.id}
                        {currentShot.takes && currentShot.takes.length > 1 && (
                            <span className="ml-2 bg-slate-800/80 px-2 py-0.5 rounded text-cyan-300">
                                Take {(currentShot.selectedTakeIndex ?? 0) + 1}
                            </span>
                        )}
                        {isGreenScreen && <span className="ml-2 bg-fuchsia-900/80 px-2 py-0.5 rounded text-fuchsia-300 border border-fuchsia-500/30">Chroma Key Active</span>}
                    </p>
                </div>
                <div className="flex gap-3 pointer-events-auto">
                    <button 
                        onClick={() => setIsReframing(true)}
                        className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-sm transition-colors"
                        title="Reframe for Social (9:16)"
                    >
                        <Icon name="smartphone" className="w-6 h-6" />
                    </button>
                    <button 
                        onClick={() => setShowExportModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-full text-xs shadow-lg transition-transform hover:scale-105"
                    >
                        <Icon name="download" className="w-4 h-4" />
                        Export Movie
                    </button>
                    <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-sm transition-colors">
                        <Icon name="cancel" className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Overlays */}
            {showFilters && (
                <div className="absolute top-24 right-16 z-30 animate-fade-in-up origin-top-right">
                    <FilterControls filters={filters} onChange={handleFilterChange} onReset={handleFilterReset} />
                </div>
            )}
            
            {showVFX && (
                <div className="absolute top-24 right-16 z-30 animate-fade-in-up origin-top-right">
                    <VFXPanel filters={filters} onChange={handleFilterChange} onReset={handleFilterReset} />
                </div>
            )}

            {showMixer && (
                <div className="absolute top-24 right-16 z-30 animate-fade-in-up origin-top-right">
                    <AudioMixer 
                        volumes={audioMix} 
                        onChange={handleAudioMixChange} 
                        autoDuck={autoDuck} 
                        onAutoDuckChange={setAutoDuck} 
                        onReset={handleMixerReset}
                    />
                </div>
            )}

            {isReframing && activeVideoSrc && (
                <SocialCropModal
                    isOpen={isReframing}
                    onClose={() => setIsReframing(false)}
                    videoUrl={activeVideoSrc}
                    onConfirm={handleReframeExport}
                />
            )}

            <ExportModal 
                isOpen={showExportModal}
                onClose={() => setShowExportModal(false)}
                onConfirm={handleConfirmExport}
                totalDuration={totalDuration}
                isProcessing={isExporting}
                processingStatus={exportStatus}
            />

            {/* Main Player Area */}
            <div className="flex-grow flex items-center justify-center relative bg-slate-900 overflow-hidden">
                <div className="relative max-h-full max-w-full shadow-2xl flex items-center justify-center w-full h-full">
                    
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

                    {/* Main Video Source (Hidden in GS mode, Visible otherwise) */}
                    <video
                        key={activeVideoSrc}
                        ref={videoRef}
                        src={activeVideoSrc}
                        className={isGreenScreen ? "hidden" : "max-h-full max-w-full block"}
                        style={videoStyle}
                        autoPlay
                        onEnded={handleEnded}
                        onTimeUpdate={handleTimeUpdate}
                        onClick={togglePlay}
                        onPlay={handleVideoPlay}
                        onPause={handleVideoPause}
                        crossOrigin="anonymous"
                    />

                    {/* Canvas for Compositing (Visible in GS mode) */}
                    <canvas 
                        ref={canvasRef}
                        className={isGreenScreen ? "max-h-full max-w-full block" : "hidden"}
                        style={videoStyle}
                        onClick={togglePlay}
                    />
                    
                    {/* Overlays Rendering */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
                        {activeOverlays.map(overlay => {
                            const state = overlayStates[overlay.id] || 'visible';
                            const animClass = getAnimationClass(overlay, state);
                            
                            const baseTransform = (!overlay.animationIn?.includes('slide') && !overlay.animationOut?.includes('slide') && !overlay.animationIn?.includes('zoom') && !overlay.animationOut?.includes('zoom')) 
                                ? 'translate(-50%, -50%)' 
                                : undefined;

                            return (
                                <div
                                    key={`${overlay.id}-${state}`}
                                    className={`absolute ${animClass}`}
                                    style={{
                                        left: `${overlay.position.x}%`,
                                        top: `${overlay.position.y}%`,
                                        transform: baseTransform,
                                        fontSize: '3vw', 
                                        color: overlay.style.color,
                                        backgroundColor: overlay.style.backgroundColor + (Math.floor((overlay.style.backgroundOpacity || 0) * 255).toString(16).padStart(2, '0')),
                                        fontFamily: overlay.style.fontFamily,
                                        padding: '0.2em 0.5em',
                                        borderRadius: '0.2em',
                                        whiteSpace: 'nowrap',
                                        textShadow: '1px 1px 2px black',
                                        animationDuration: `${overlay.animationDuration || 0.5}s`
                                    }}
                                >
                                    {overlay.text}
                                </div>
                            );
                        })}
                    </div>
                    
                    {(filters.grain > 0 || filters.vfxType === 'grain') && (
                        <div 
                            className="absolute inset-0 pointer-events-none mix-blend-overlay"
                            style={{ 
                                backgroundImage: `url(${NOISE_BASE64})`,
                                opacity: (Math.max(filters.grain, (filters.vfxType === 'grain' ? filters.vfxIntensity : 0))) / 100
                            }} 
                        />
                    )}

                    {filters.vfxType === 'vignette' && (
                        <div 
                            className="absolute inset-0 pointer-events-none"
                            style={{
                                background: 'radial-gradient(circle, transparent 50%, black 150%)',
                                opacity: filters.vfxIntensity / 100
                            }}
                        />
                    )}

                    {filters.vfxType === 'letterbox' && (
                        <>
                            <div className="absolute top-0 left-0 right-0 bg-black pointer-events-none" style={{ height: '12%' }} />
                            <div className="absolute bottom-0 left-0 right-0 bg-black pointer-events-none" style={{ height: '12%' }} />
                        </>
                    )}

                    {/* Captions Overlay (Burn-in Preview) */}
                    {showCaptions && currentShot.dialogueText && (
                        <div className="absolute bottom-8 left-0 right-0 text-center pointer-events-none px-8 z-20">
                            <span 
                                className="inline-block text-white text-xl sm:text-2xl font-bold px-2 py-1"
                                style={{ 
                                    textShadow: '2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
                                    fontFamily: 'Arial, sans-serif'
                                }}
                            >
                                {currentShot.dialogueText}
                            </span>
                        </div>
                    )}
                </div>
                
                {/* Play/Pause Overlay Icon */}
                {!isPlaying && !isExporting && !isReframing && !showExportModal && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none z-10">
                        <div className="p-4 bg-white/10 rounded-full backdrop-blur-md">
                            <Icon name="play" className="w-12 h-12 text-white" />
                        </div>
                    </div>
                )}

                {/* Subtitles / Context */}
                {!showCaptions && (
                    <div className="absolute bottom-20 left-0 right-0 text-center px-4 pointer-events-none z-10">
                        <div className="inline-block bg-black/60 backdrop-blur-sm px-4 py-2 rounded-lg text-white text-sm font-medium shadow-lg max-w-3xl truncate opacity-50">
                            {currentShot.action}
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Controls */}
            <div className="h-24 bg-slate-900 border-t border-slate-800 flex flex-col justify-center px-6 z-20">
                {/* Timeline Scrubber */}
                <div className="relative mb-6 group cursor-pointer h-4">
                    <div className="absolute top-1.5 left-0 right-0 h-1 bg-slate-700 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-cyan-500 transition-all duration-100 ease-linear"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    {currentShot.sfx && currentShot.sfx.map(sfx => (
                        <div 
                            key={sfx.id}
                            className={`absolute top-0.5 w-3 h-3 rounded-full border-2 border-slate-900 transform -translate-x-1/2 transition-colors ${activeSFX.includes(sfx.id) ? 'bg-purple-400 scale-125' : 'bg-purple-600'}`}
                            style={{ left: getMarkerLeft(sfx.timestamp) }}
                            title={`${sfx.description} @ ${sfx.timestamp}s`}
                        />
                    ))}
                </div>

                {/* Controls Row */}
                <div className="flex justify-between items-center relative">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setShowFilters(!showFilters)} className={`p-2 rounded hover:bg-slate-800 ${showFilters ? 'text-cyan-400' : 'text-slate-400'}`} title="Color Grading">
                            <Icon name="sliders" className="w-5 h-5" />
                        </button>
                        <button onClick={() => setShowVFX(!showVFX)} className={`p-2 rounded hover:bg-slate-800 ${showVFX ? 'text-fuchsia-400' : 'text-slate-400'}`} title="VFX & Atmosphere">
                            <Icon name="magic" className="w-5 h-5" />
                        </button>
                        <button onClick={() => setShowMixer(!showMixer)} className={`p-2 rounded hover:bg-slate-800 ${showMixer ? 'text-cyan-400' : 'text-slate-400'}`} title="Audio Mixer">
                            <Icon name="audio" className="w-5 h-5" />
                        </button>
                        <button onClick={() => setShowCaptions(!showCaptions)} className={`p-2 rounded hover:bg-slate-800 ${showCaptions ? 'text-green-400' : 'text-slate-400'}`} title="Toggle Captions">
                            <Icon name="subtitles" className="w-5 h-5" />
                        </button>
                    </div>
                    
                    <div className="flex justify-center items-center gap-6 absolute left-1/2 -translate-x-1/2">
                        <button onClick={prevClip} disabled={currentIndex === 0} className="text-slate-400 hover:text-white disabled:opacity-30 transition-colors">
                            <Icon name="chevron-down" className="w-6 h-6 rotate-90" />
                        </button>

                        <button onClick={togglePlay} className="p-3 bg-cyan-600 hover:bg-cyan-500 rounded-full text-white shadow-lg shadow-cyan-900/20 transition-transform hover:scale-105">
                            <Icon name={isPlaying ? 'spinner' : 'play'} className={`w-5 h-5 ${isPlaying ? 'animate-spin' : ''}`} />
                        </button>

                        <button onClick={nextClip} disabled={currentIndex === playlist.length - 1} className="text-slate-400 hover:text-white disabled:opacity-30 transition-colors">
                            <Icon name="chevron-down" className="w-6 h-6 -rotate-90" />
                        </button>
                    </div>

                    <div className="w-20 text-right text-xs text-slate-500 font-mono">
                        {currentIndex + 1}/{playlist.length}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TimelinePlayer;
