
import React, { useState, useEffect, useRef } from 'react';
import { Shot, VideoFilters } from '../types';
import Icon from './Icon';
import { stitchVideos } from '../services/videoEditorService';
import FilterControls from './FilterControls';

interface TimelinePlayerProps {
    shots: Shot[];
    onClose: () => void;
}

// 64x64 Noise Pattern Base64 (Tiny transparent png with noise)
const NOISE_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAQAAAAAYLLVAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QA/4ePzL8AAAAJcEhZcwAACxMAAAsTAQCanBgAAAAHdElNRQfmAxoMHSY+q45CAAABxElEQVRo3u2ZPU/CQBCG3/wDBiS+jYn/x8mfiYmJxvjR+DEh0ZgYExMTE41x+TEh8W9Y5x0X7h4tqUe6V3q5vW93793tFvA/x8W/Y98e27b9cOyH7bft12Pbvj22/bH9sX2z/bT9tP2y/bb9sX2zfbV9tf2wfbN9sf2wfbV9sX21fbF9tf2wfbF9sX2x/bD9sH2zfbX9sH2zfbH9sH21fbF9tf2wfbF9sX2x/bB9s321/bB9s32x/bB9tX2xfbX9sH2xfbF9sf2wfbN9tf2wfbN9sf2wfbV9sX21/bB9sX2xfbH9sH2zfbX9sH2zfbH9sH21fbF9tf2wfbF9sf2x/bD9sH21/bB9s32x/bB9tX2xfbX9sH2xfbF9sf2wfbN9tf2wfbN9sf2wfbV9sX21/bB9sX2xfbH9sH2zfbX9sH2zfbH9sH21fbF9tf2wfbF9sf2x/bD9sH21/bB9s32x/bB9tX2xfbX9sH2xfbF9sf2wfbN9tf2wfbN9sf2wfbV9sX21/bB9sX2xfbH9sH2zfbX9sH2zfbH9sH21fbF9tf2wfbF9sf2x/bD9sH21/bB9s32x/bB9tX2xfbX9sH2xfbF9sf2wfbN9tf2wfbN9sf2wfbV9sX21/bB9sX2xfbH9sH2zfbX9sH2zfbH9sH21fbF9tf2wfbF9sf2x/bD9sH21/bB9s32x/bB9tX2xfbX9sH2x/b/t9/8Ag825R3+3gH8AAAAASUVORK5CYII=";

const TimelinePlayer: React.FC<TimelinePlayerProps> = ({ shots, onClose }) => {
    // Filter shots to only include those with videos
    // Priority: generatedVideoUrl which is synced with selectedTakeIndex
    const playlist = React.useMemo(() => shots.filter(s => s.generatedVideoUrl), [shots]);
    
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const [progress, setProgress] = useState(0);
    
    // Export State
    const [isExporting, setIsExporting] = useState(false);
    const [exportStatus, setExportStatus] = useState('');

    // Global Filter State
    const [filters, setFilters] = useState<VideoFilters>({
        contrast: 100,
        saturation: 100,
        sepia: 0,
        grain: 0
    });
    const [showFilters, setShowFilters] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    
    // SFX References
    const [activeSFX, setActiveSFX] = useState<string[]>([]); // Track playing SFX IDs
    const lastTimeRef = useRef<number>(0);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === ' ') {
                e.preventDefault();
                togglePlay();
            }
            if (e.key === 'ArrowRight') nextClip();
            if (e.key === 'ArrowLeft') prevClip();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, isPlaying]);

    // Reset progress and handle sync when index changes
    useEffect(() => {
        setProgress(0);
        lastTimeRef.current = 0;
        setIsPlaying(true);
        setActiveSFX([]);
        
        // Sync Audio
        if (audioRef.current) {
            audioRef.current.pause();
            const currentShot = playlist[currentIndex];
            if (currentShot?.audioUrl) {
                audioRef.current.src = currentShot.audioUrl;
                audioRef.current.volume = currentShot.audioVolume ?? 1.0;
                audioRef.current.currentTime = 0;
            } else {
                audioRef.current.src = "";
            }
        }
    }, [currentIndex, playlist]);

    const currentShot = playlist[currentIndex];

    // Determine correct source. StoryBoard syncs generatedVideoUrl with selected take,
    // but we add a safety check here to prefer the take array if populated.
    const activeVideoSrc = (currentShot.takes && typeof currentShot.selectedTakeIndex === 'number' && currentShot.takes[currentShot.selectedTakeIndex]) 
        ? currentShot.takes[currentShot.selectedTakeIndex] 
        : currentShot.generatedVideoUrl;

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
                audioRef.current?.pause();
            } else {
                videoRef.current.play();
                if (currentShot.audioUrl && audioRef.current?.src) {
                    audioRef.current.play().catch(e => console.warn("Audio play blocked", e));
                }
            }
            setIsPlaying(!isPlaying);
        }
    };

    // Keep audio synced if video seeks or plays
    const handleVideoPlay = () => {
        if (currentShot.audioUrl && audioRef.current) {
            audioRef.current.play().catch(e => console.log("Audio play failed (interaction needed)", e));
        }
    };

    const handleVideoPause = () => {
        audioRef.current?.pause();
    };

    const handleEnded = () => {
        if (currentIndex < playlist.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            setIsPlaying(false);
            audioRef.current?.pause();
        }
    };

    const nextClip = () => {
        if (currentIndex < playlist.length - 1) setCurrentIndex(currentIndex + 1);
    };

    const prevClip = () => {
        if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            const currentTime = videoRef.current.currentTime;
            const duration = videoRef.current.duration;
            const pct = (currentTime / duration) * 100;
            setProgress(pct || 0);
            
            // Audio Sync Logic
            if (audioRef.current && !audioRef.current.paused && audioRef.current.src) {
                const diff = Math.abs(audioRef.current.currentTime - currentTime);
                if (diff > 0.3) {
                    audioRef.current.currentTime = currentTime;
                }
            }

            // SFX Trigger Logic
            if (currentShot.sfx && currentShot.sfx.length > 0) {
                currentShot.sfx.forEach(sfx => {
                    if (currentTime > lastTimeRef.current) {
                        if (sfx.timestamp >= lastTimeRef.current && sfx.timestamp < currentTime) {
                            const audio = new Audio(sfx.audioUrl);
                            audio.volume = currentShot.audioVolume ?? 1.0;
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

    const handleExport = async () => {
        if (isExporting || playlist.length === 0) return;
        
        setIsExporting(true);
        if (videoRef.current) {
            videoRef.current.pause();
            audioRef.current?.pause();
            setIsPlaying(false);
        }

        try {
            const clips = playlist.map(s => ({
                videoUrl: (s.takes && typeof s.selectedTakeIndex === 'number' && s.takes[s.selectedTakeIndex]) 
                    ? s.takes[s.selectedTakeIndex] 
                    : s.generatedVideoUrl!,
                audioUrl: s.audioUrl,
                audioVolume: s.audioVolume ?? 1.0
            }));

            // Pass filters to the stitcher
            const stitchedUrl = await stitchVideos(clips, 'veo_movie.mp4', (status) => {
                setExportStatus(status);
            }, filters);

            const link = document.createElement('a');
            link.href = stitchedUrl;
            link.download = `veo-movie-${Date.now()}.mp4`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(stitchedUrl);

        } catch (error) {
            console.error(error);
            alert("Failed to export movie. See console for details.");
        } finally {
            setIsExporting(false);
            setExportStatus('');
        }
    };

    const handleFilterChange = (key: keyof VideoFilters, value: number) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleFilterReset = () => {
        setFilters({ contrast: 100, saturation: 100, sepia: 0, grain: 0 });
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

    const getMarkerLeft = (timestamp: number) => {
        if (!videoRef.current?.duration) return '0%';
        return `${(timestamp / videoRef.current.duration) * 100}%`;
    };

    const videoStyle = {
        filter: `contrast(${filters.contrast}%) saturate(${filters.saturation}%) sepia(${filters.sepia}%)`
    };

    return (
        <div className="fixed inset-0 bg-black z-[100] flex flex-col animate-fade-in-up">
            <audio ref={audioRef} />

            {/* Header */}
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
                    </p>
                </div>
                <div className="flex gap-3 pointer-events-auto">
                    <button 
                        onClick={() => setShowFilters(!showFilters)}
                        className={`p-2 rounded-full backdrop-blur-sm transition-colors border ${showFilters ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50' : 'bg-white/10 text-white border-white/10 hover:bg-white/20'}`}
                        title="Color Grading"
                    >
                        <Icon name="filter" className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={handleExport}
                        disabled={isExporting}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold border transition-all ${
                            isExporting 
                            ? 'bg-slate-800 text-slate-400 border-slate-700' 
                            : 'bg-white/10 hover:bg-white/20 text-white border-white/10 hover:border-white/30 backdrop-blur-md'
                        }`}
                    >
                        {isExporting ? (
                            <>
                                <Icon name="spinner" className="w-4 h-4 animate-spin" />
                                <span>{exportStatus || "Exporting..."}</span>
                            </>
                        ) : (
                            <>
                                <Icon name="download" className="w-4 h-4" />
                                <span>Export Movie ({playlist.length})</span>
                            </>
                        )}
                    </button>
                    <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-sm transition-colors">
                        <Icon name="cancel" className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Filter Controls Overlay */}
            {showFilters && (
                <div className="absolute top-24 right-6 z-30 animate-fade-in-up origin-top-right">
                    <FilterControls filters={filters} onChange={handleFilterChange} onReset={handleFilterReset} />
                </div>
            )}

            {/* Main Player Area */}
            <div className="flex-grow flex items-center justify-center relative bg-slate-900 overflow-hidden">
                <div className="relative max-h-full max-w-full shadow-2xl">
                    <video
                        key={activeVideoSrc}
                        ref={videoRef}
                        src={activeVideoSrc}
                        className="max-h-full max-w-full block"
                        style={videoStyle}
                        autoPlay
                        onEnded={handleEnded}
                        onTimeUpdate={handleTimeUpdate}
                        onClick={togglePlay}
                        onPlay={handleVideoPlay}
                        onPause={handleVideoPause}
                    />
                    {/* Grain Overlay */}
                    {filters.grain > 0 && (
                        <div 
                            className="absolute inset-0 pointer-events-none mix-blend-overlay"
                            style={{ 
                                backgroundImage: `url(${NOISE_BASE64})`,
                                opacity: filters.grain / 100
                            }} 
                        />
                    )}
                </div>
                
                {/* Play/Pause Overlay Icon */}
                {!isPlaying && !isExporting && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none z-10">
                        <div className="p-4 bg-white/10 rounded-full backdrop-blur-md">
                            <Icon name="play" className="w-12 h-12 text-white" />
                        </div>
                    </div>
                )}

                {/* Subtitles / Context */}
                <div className="absolute bottom-20 left-0 right-0 text-center px-4 pointer-events-none z-10">
                    <div className="inline-block bg-black/60 backdrop-blur-sm px-4 py-2 rounded-lg text-white text-sm font-medium shadow-lg max-w-3xl truncate">
                        {currentShot.action}
                    </div>
                </div>
            </div>

            {/* Bottom Controls */}
            <div className="h-24 bg-slate-900 border-t border-slate-800 flex flex-col justify-center px-6 z-20">
                {/* Detailed Timeline Scrubber */}
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

                {/* Main Controls Row */}
                <div className="flex justify-between items-center relative">
                    <div className="w-20"></div> {/* Spacer */}
                    
                    <div className="flex justify-center items-center gap-6">
                        <button 
                            onClick={prevClip} 
                            disabled={currentIndex === 0}
                            className="text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                        >
                            <Icon name="chevron-down" className="w-6 h-6 rotate-90" />
                        </button>

                        <button 
                            onClick={togglePlay}
                            className="p-3 bg-cyan-600 hover:bg-cyan-500 rounded-full text-white shadow-lg shadow-cyan-900/20 transition-transform hover:scale-105"
                        >
                            <Icon name={isPlaying ? 'spinner' : 'play'} className={`w-5 h-5 ${isPlaying ? 'animate-spin' : ''}`} />
                        </button>

                        <button 
                            onClick={nextClip}
                            disabled={currentIndex === playlist.length - 1}
                            className="text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                        >
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
