
import React, { useState, useRef, useEffect, useMemo } from 'react';
import Icon from '@shared/components/ui/Icon';
import { formatTimecode } from '@core/utils/timeUtils';

interface LyricSyncerModalProps {
    isOpen: boolean;
    onClose: () => void;
    lyricsText: string;
    audioUrl: string;
    onSave: (srtContent: string) => void;
}

interface LyricLine {
    text: string;
    timestamp: number | null;
}

const LyricSyncerModal: React.FC<LyricSyncerModalProps> = ({ isOpen, onClose, lyricsText, audioUrl, onSave }) => {
    const [lines, setLines] = useState<LyricLine[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    
    const audioRef = useRef<HTMLAudioElement>(null);
    const activeLineRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Initialize lines from text
    useEffect(() => {
        if (isOpen && lyricsText) {
            const rawLines = lyricsText.split('\n').filter(l => l.trim() !== '');
            // Filter out metadata tags like [Chorus] if desired, or keep them. 
            // Keeping them allows syncing section headers which is useful.
            setLines(rawLines.map(text => ({ text, timestamp: null })));
            setCurrentIndex(0);
            setProgress(0);
        }
    }, [isOpen, lyricsText]);

    // Handle Keyboard (Space to Sync)
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                e.preventDefault(); // Prevent scrolling
                if (!isPlaying) {
                    togglePlay();
                } else {
                    handleSyncTap();
                }
            } else if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, isPlaying, currentIndex, lines.length]); // Dependencies important for closure capture

    // Auto-scroll to active line
    useEffect(() => {
        if (activeLineRef.current && scrollContainerRef.current) {
            activeLineRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }
    }, [currentIndex]);

    const togglePlay = () => {
        if (!audioRef.current) return;
        
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleSyncTap = () => {
        if (!audioRef.current || currentIndex >= lines.length) return;

        const currentTime = audioRef.current.currentTime;
        
        setLines(prev => {
            const newLines = [...prev];
            newLines[currentIndex] = { ...newLines[currentIndex], timestamp: currentTime };
            return newLines;
        });

        setCurrentIndex(prev => prev + 1);
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            const pct = (audioRef.current.currentTime / audioRef.current.duration) * 100;
            setProgress(pct);
        }
    };

    const handleReset = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        setIsPlaying(false);
        setCurrentIndex(0);
        setLines(prev => prev.map(l => ({ ...l, timestamp: null })));
    };

    const generateSRT = () => {
        if (!audioRef.current) return;
        const totalDuration = audioRef.current.duration;

        let srtOutput = '';
        
        lines.forEach((line, index) => {
            if (line.timestamp === null) return;

            const startTime = line.timestamp;
            // End time is the start of next line, or 3 seconds later, or end of audio
            let endTime = 0;
            
            if (index < lines.length - 1 && lines[index + 1].timestamp !== null) {
                endTime = lines[index + 1].timestamp!;
            } else {
                endTime = Math.min(startTime + 3, totalDuration);
            }

            // Ensure valid duration
            if (endTime <= startTime) endTime = startTime + 1;

            srtOutput += `${index + 1}\n`;
            srtOutput += `${formatTimecode(startTime)} --> ${formatTimecode(endTime)}\n`;
            srtOutput += `${line.text}\n\n`;
        });

        onSave(srtOutput);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl flex items-center justify-center z-[150] p-4 animate-fade-in-up">
            <div className="w-full max-w-3xl flex flex-col h-[85vh] bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
                
                {/* Header */}
                <div className="p-5 border-b border-slate-700 bg-slate-900 flex justify-between items-center z-10">
                    <div>
                        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                            <Icon name="music" className="w-6 h-6 text-fuchsia-400" />
                            Lyric Syncer
                        </h2>
                        <p className="text-xs text-slate-400 mt-1">Tap <strong className="text-cyan-400">Spacebar</strong> at the start of each line.</p>
                    </div>
                    <div className="flex gap-2">
                         <button 
                            onClick={handleReset}
                            className="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white border border-slate-600 rounded-lg hover:bg-slate-700 transition-colors"
                        >
                            Reset
                        </button>
                        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                            <Icon name="cancel" className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Lyrics Area */}
                <div 
                    ref={scrollContainerRef}
                    className="flex-grow overflow-y-auto p-8 flex flex-col items-center space-y-6 relative bg-slate-950/50"
                >
                    {/* Visual Center Marker */}
                    <div className="absolute top-1/2 left-0 right-0 h-px bg-cyan-500/20 pointer-events-none z-0" />

                    {lines.map((line, idx) => {
                        const isActive = idx === currentIndex;
                        const isPast = idx < currentIndex;
                        
                        return (
                            <div 
                                key={idx}
                                ref={isActive ? activeLineRef : null}
                                className={`
                                    relative z-10 text-center transition-all duration-300 max-w-2xl px-6 py-4 rounded-xl cursor-pointer
                                    ${isActive 
                                        ? 'scale-110 bg-cyan-900/20 border border-cyan-500/50 shadow-[0_0_30px_rgba(34,211,238,0.1)]' 
                                        : 'scale-95 opacity-40 hover:opacity-70'}
                                    ${isPast ? 'text-green-400 opacity-60' : ''}
                                `}
                                onClick={() => {
                                    // Allow manual correction by clicking
                                    if(audioRef.current) {
                                        const t = audioRef.current.currentTime;
                                        setLines(prev => prev.map((l, i) => i === idx ? { ...l, timestamp: t } : l));
                                        setCurrentIndex(idx + 1);
                                    }
                                }}
                            >
                                <p className={`text-2xl md:text-3xl font-bold ${isActive ? 'text-cyan-100' : 'text-slate-400'}`}>
                                    {line.text}
                                </p>
                                {line.timestamp !== null && (
                                    <span className="block mt-1 text-[10px] font-mono text-cyan-500/70">
                                        {formatTimecode(line.timestamp)}
                                    </span>
                                )}
                            </div>
                        );
                    })}

                    {/* End State */}
                    {currentIndex >= lines.length && (
                        <div className="py-12 text-center animate-bounce">
                            <p className="text-xl text-green-400 font-bold">Sync Complete!</p>
                            <p className="text-slate-500 text-sm">Review timestamps or click Save.</p>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="p-4 bg-slate-900 border-t border-slate-700">
                    {/* Audio Player (Hidden visually but functional controls) */}
                    <audio 
                        ref={audioRef} 
                        src={audioUrl} 
                        onTimeUpdate={handleTimeUpdate}
                        onEnded={() => setIsPlaying(false)}
                    />

                    {/* Progress Bar */}
                    <div 
                        className="w-full h-2 bg-slate-800 rounded-full mb-4 cursor-pointer relative overflow-hidden"
                        onClick={(e) => {
                            if (!audioRef.current) return;
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = e.clientX - rect.left;
                            const pct = x / rect.width;
                            audioRef.current.currentTime = pct * audioRef.current.duration;
                        }}
                    >
                        <div 
                            className="h-full bg-cyan-500 transition-all duration-100 ease-linear"
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                    <div className="flex items-center justify-between gap-4">
                        <button
                            onClick={togglePlay}
                            className="w-12 h-12 flex items-center justify-center rounded-full bg-slate-800 text-cyan-400 hover:bg-slate-700 hover:text-white transition-colors"
                        >
                            <Icon name={isPlaying ? 'square' : 'play'} className="w-5 h-5" />
                        </button>

                        <button
                            onClick={handleSyncTap}
                            disabled={!isPlaying || currentIndex >= lines.length}
                            className={`flex-grow h-14 rounded-xl font-bold text-lg uppercase tracking-widest shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-3 ${
                                isPlaying && currentIndex < lines.length
                                ? 'bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white hover:shadow-fuchsia-500/25'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                        >
                            <div className={`w-3 h-3 rounded-full ${isPlaying ? 'bg-red-500 animate-pulse' : 'bg-slate-600'}`} />
                            {isPlaying ? "Tap Spacebar to Sync" : "Press Play to Start"}
                        </button>

                        <button
                            onClick={generateSRT}
                            disabled={currentIndex === 0}
                            className="h-12 px-6 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Save SRT
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LyricSyncerModal;
