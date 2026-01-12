
import React, { useState, useEffect, useRef } from 'react';
import { Shot } from '../types';
import Icon from './Icon';

interface TimelinePlayerProps {
    shots: Shot[];
    onClose: () => void;
}

const TimelinePlayer: React.FC<TimelinePlayerProps> = ({ shots, onClose }) => {
    // Filter shots to only include those with videos
    const playlist = React.useMemo(() => shots.filter(s => s.generatedVideoUrl), [shots]);
    
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const [progress, setProgress] = useState(0);
    const videoRef = useRef<HTMLVideoElement>(null);

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

    // Reset progress when index changes
    useEffect(() => {
        setProgress(0);
        setIsPlaying(true);
    }, [currentIndex]);

    const currentShot = playlist[currentIndex];

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleEnded = () => {
        if (currentIndex < playlist.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            setIsPlaying(false);
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
            const pct = (videoRef.current.currentTime / videoRef.current.duration) * 100;
            setProgress(pct || 0);
        }
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

    return (
        <div className="fixed inset-0 bg-black z-[100] flex flex-col animate-fade-in-up">
            {/* Header / Controls Overlay */}
            <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10 bg-gradient-to-b from-black/80 to-transparent">
                <div>
                    <h2 className="text-white font-bold text-lg drop-shadow-md">Timeline Player</h2>
                    <p className="text-slate-300 text-xs drop-shadow-md">
                        Clip {currentIndex + 1} of {playlist.length} • Shot #{currentShot.id}
                    </p>
                </div>
                <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-sm transition-colors">
                    <Icon name="cancel" className="w-6 h-6" />
                </button>
            </div>

            {/* Main Player Area */}
            <div className="flex-grow flex items-center justify-center relative bg-slate-900">
                <video
                    ref={videoRef}
                    src={currentShot.generatedVideoUrl}
                    className="max-h-full max-w-full shadow-2xl"
                    autoPlay
                    onEnded={handleEnded}
                    onTimeUpdate={handleTimeUpdate}
                    onClick={togglePlay}
                />
                
                {/* Play/Pause Overlay Icon */}
                {!isPlaying && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                        <div className="p-4 bg-white/10 rounded-full backdrop-blur-md">
                            <Icon name="play" className="w-12 h-12 text-white" />
                        </div>
                    </div>
                )}

                {/* Subtitles / Context */}
                <div className="absolute bottom-20 left-0 right-0 text-center px-4 pointer-events-none">
                    <div className="inline-block bg-black/60 backdrop-blur-sm px-4 py-2 rounded-lg text-white text-sm font-medium shadow-lg max-w-3xl truncate">
                        {currentShot.action}
                    </div>
                </div>
            </div>

            {/* Bottom Controls */}
            <div className="h-20 bg-slate-900 border-t border-slate-800 flex flex-col justify-center px-6">
                {/* Progress Indicators */}
                <div className="flex gap-1 mb-3">
                    {playlist.map((_, idx) => (
                        <div key={idx} className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
                            <div 
                                className={`h-full bg-cyan-500 transition-all duration-100 ease-linear ${
                                    idx < currentIndex ? 'w-full' : 
                                    idx === currentIndex ? `w-[${progress}%]` : 'w-0'
                                }`}
                                style={{ width: idx === currentIndex ? `${progress}%` : (idx < currentIndex ? '100%' : '0%') }}
                            />
                        </div>
                    ))}
                </div>

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
            </div>
        </div>
    );
};

export default TimelinePlayer;
