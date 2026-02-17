import React, { useState, useEffect, useRef } from 'react';
import { Shot, CharacterProfile } from '@core/types';
import Icon from '@shared/components/ui/Icon';
import { logger } from '@core/services/loggerService';

interface TableReadPlayerProps {
  shots: Shot[];
  savedCharacters: CharacterProfile[];
  onClose: () => void;
}

const TableReadPlayer: React.FC<TableReadPlayerProps> = ({ shots, savedCharacters, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const audioRef = useRef<HTMLAudioElement>(null);
  const timerRef = useRef<number | null>(null);

  const currentShot = shots[currentIndex];
  const character = savedCharacters.find((c) => c.id === currentShot.characterId);

  // Determine visual source
  const imageUrl = currentShot.conceptImageUrl || character?.thumbnailUrl;

  // Determine text content
  const displayText = currentShot.dialogueText
    ? `"${currentShot.dialogueText}"`
    : currentShot.action;

  useEffect(() => {
    if (!isPlaying) {
      if (audioRef.current) audioRef.current.pause();
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const handleNext = () => {
      if (currentIndex < shots.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        setIsPlaying(false);
      }
    };

    // Reset previous state
    if (timerRef.current) clearTimeout(timerRef.current);

    if (currentShot.audioUrl) {
      // Play Audio
      if (audioRef.current) {
        audioRef.current.src = currentShot.audioUrl;
        audioRef.current.volume = currentShot.audioVolume ?? 1.0;
        audioRef.current.play().catch((err) => {
          logger.warn('Audio playback failed, falling back to timer', err);
          // Fallback to timer if audio fails
          const duration = Math.max(3000, displayText.length * 100);
          timerRef.current = window.setTimeout(handleNext, duration);
        });

        audioRef.current.onended = handleNext;
        audioRef.current.onerror = () => {
          // Fallback on error
          const duration = Math.max(3000, displayText.length * 100);
          timerRef.current = window.setTimeout(handleNext, duration);
        };
      }
    } else {
      // Estimate duration based on reading speed (approx 100ms per character, min 3s)
      const duration = Math.max(3000, displayText.length * 100);
      timerRef.current = window.setTimeout(handleNext, duration);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentIndex, isPlaying, shots.length, currentShot, displayText]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      }
      if (e.key === 'ArrowRight') {
        if (currentIndex < shots.length - 1) {
          setCurrentIndex((prev) => prev + 1);
        }
      }
      if (e.key === 'ArrowLeft') {
        if (currentIndex > 0) {
          setCurrentIndex((prev) => prev - 1);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, shots.length, onClose]);

  const progressPercentage = ((currentIndex + 1) / shots.length) * 100;

  return (
    <div className="fixed inset-0 bg-black z-[120] flex flex-col justify-center items-center animate-fade-in-up">
      <audio ref={audioRef} className="hidden" />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10 bg-gradient-to-b from-black/80 to-transparent">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Icon name="video" className="w-6 h-6 text-fuchsia-400" />
            Table Read (Animatic)
          </h2>
          <p className="text-sm text-slate-400">
            Shot {currentIndex + 1} of {shots.length}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-sm transition-colors"
        >
          <Icon name="cancel" className="w-6 h-6" />
        </button>
      </div>

      {/* Main Visual Area */}
      <div className="relative w-full h-full flex items-center justify-center p-8 pb-32">
        <div className="relative max-w-5xl w-full aspect-video bg-slate-900 rounded-lg shadow-2xl border border-slate-800 overflow-hidden flex items-center justify-center">
          {imageUrl ? (
            <>
              <img
                src={imageUrl}
                alt={`Shot ${currentShot.id}`}
                className="w-full h-full object-contain z-10 relative"
              />
              {/* Blurred Background Fill */}
              <img
                src={imageUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover opacity-30 blur-2xl z-0"
              />
            </>
          ) : (
            <div className="text-center text-slate-500">
              {character ? (
                <div className="mb-4 flex justify-center">
                  <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center border-2 border-slate-700">
                    <span className="text-2xl font-bold">{character.name.charAt(0)}</span>
                  </div>
                </div>
              ) : (
                <Icon name="image" className="w-24 h-24 mx-auto mb-4 opacity-20" />
              )}
              <h3 className="text-2xl font-bold text-slate-300">Scene #{currentShot.id}</h3>
              <p className="text-slate-500 mt-2">No visuals available</p>
            </div>
          )}
        </div>
      </div>

      {/* Subtitles / Script Area */}
      <div className="absolute bottom-24 left-0 right-0 px-8 text-center pointer-events-none">
        <div className="inline-block bg-black/70 backdrop-blur-md px-8 py-4 rounded-xl shadow-2xl max-w-4xl">
          {currentShot.characterId && (
            <div className="text-fuchsia-400 text-sm font-bold uppercase tracking-wider mb-1">
              {character?.name || 'Character'}
            </div>
          )}
          <p
            className={`text-white font-medium leading-relaxed ${currentShot.dialogueText ? 'text-2xl font-serif italic' : 'text-lg text-slate-300'}`}
          >
            {displayText}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-slate-900 border-t border-slate-800 flex items-center px-8 justify-between">
        <div className="flex gap-4 items-center">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-12 h-12 flex items-center justify-center rounded-full bg-slate-100 text-slate-900 hover:bg-cyan-400 hover:text-white transition-colors shadow-lg"
          >
            <Icon name={isPlaying ? 'spinner' : 'play'} className="w-5 h-5" />
          </button>

          <div className="flex gap-2">
            <button
              onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
              className="p-2 text-slate-400 hover:text-white transition-colors"
            >
              <Icon name="chevron-down" className="w-6 h-6 rotate-90" />
            </button>
            <button
              onClick={() => setCurrentIndex(Math.min(shots.length - 1, currentIndex + 1))}
              className="p-2 text-slate-400 hover:text-white transition-colors"
            >
              <Icon name="chevron-down" className="w-6 h-6 -rotate-90" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex-grow mx-8 h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-fuchsia-600 to-cyan-500 transition-all duration-300 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        <div className="text-sm font-mono text-slate-500">
          {currentIndex + 1} / {shots.length}
        </div>
      </div>
    </div>
  );
};

export default TableReadPlayer;
