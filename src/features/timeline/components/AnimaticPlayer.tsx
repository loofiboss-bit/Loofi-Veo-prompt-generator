import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { Shot } from '@core/types';
import {
  calculateShotMotion,
  snapShotsToBeatGrid,
  formatTimecode,
  speakDialogueLine,
} from '@core/services/animaticService';
import Icon from '@shared/components/ui/Icon';

interface AnimaticPlayerProps {
  shots: Shot[];
  bpm?: number;
  onUpdateShots?: (updatedShots: Shot[]) => void;
  className?: string;
}

export const AnimaticPlayer: React.FC<AnimaticPlayerProps> = ({
  shots,
  bpm = 120,
  onUpdateShots,
  className = '',
}) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);

  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const spokenShotIdRef = useRef<number | null>(null);

  // Total duration
  const totalDuration = useMemo(() => {
    return shots.reduce((acc, shot) => acc + (shot.duration || 4), 0);
  }, [shots]);

  // Current active shot at currentTime
  const activeShotInfo = useMemo(() => {
    let elapsed = 0;
    for (let i = 0; i < shots.length; i++) {
      const shot = shots[i];
      const duration = shot.duration || 4;
      if (currentTime >= elapsed && currentTime <= elapsed + duration) {
        return {
          shot,
          index: i,
          shotStart: elapsed,
          shotEnd: elapsed + duration,
          shotProgress: (currentTime - elapsed) / duration,
        };
      }
      elapsed += duration;
    }
    return {
      shot: shots[shots.length - 1] || null,
      index: shots.length - 1,
      shotStart: elapsed,
      shotEnd: elapsed,
      shotProgress: 1,
    };
  }, [shots, currentTime]);

  // Playback Loop
  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      lastTimeRef.current = null;
      return;
    }

    const tick = (timestamp: number) => {
      if (lastTimeRef.current !== null) {
        const deltaSec = ((timestamp - lastTimeRef.current) / 1000) * playbackRate;
        setCurrentTime((prev) => {
          const next = prev + deltaSec;
          if (next >= totalDuration) {
            setIsPlaying(false);
            return totalDuration;
          }
          return next;
        });
      }
      lastTimeRef.current = timestamp;
      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, playbackRate, totalDuration]);

  // Trigger TTS dialogue on shot transition
  useEffect(() => {
    if (!isPlaying || !ttsEnabled || !activeShotInfo.shot) return;
    const shot = activeShotInfo.shot;
    if (shot.id !== spokenShotIdRef.current) {
      spokenShotIdRef.current = shot.id;
      const text = shot.dialogue || shot.dialogueText;
      if (text) {
        speakDialogueLine(text, {
          characterName: shot.characterArchetype || 'Narrator',
        });
      }
    }
  }, [isPlaying, ttsEnabled, activeShotInfo.shot]);

  // Handle Play/Pause
  const handleTogglePlay = () => {
    if (currentTime >= totalDuration) {
      setCurrentTime(0);
      spokenShotIdRef.current = null;
    }
    setIsPlaying((prev) => !prev);
  };

  // Beat-Snap Action
  const handleSnapToBeat = () => {
    if (!onUpdateShots) return;
    const snapped = snapShotsToBeatGrid(shots, bpm);
    onUpdateShots(snapped);
  };

  // Calculate dynamic motion transforms for the active shot
  const motionStyle = useMemo(() => {
    if (!activeShotInfo.shot) {
      return { transform: 'none', opacity: 1 };
    }
    const motion = calculateShotMotion(
      activeShotInfo.shot.camera || 'push-in',
      activeShotInfo.shotProgress,
    );
    return {
      transform: `scale(${motion.scale}) translate(${motion.translateX}%, ${motion.translateY}%) rotate(${motion.rotation}deg)`,
      opacity: motion.opacity,
    };
  }, [activeShotInfo]);

  const activeImage =
    activeShotInfo.shot?.conceptImageUrl ||
    activeShotInfo.shot?.imageUrl ||
    (activeShotInfo.shot as { imageAsset?: string })?.imageAsset;

  return (
    <div
      className={`rounded-xl border border-border/80 bg-card p-4 shadow-md space-y-4 ${className}`}
    >
      <div className="flex items-center justify-between border-b border-border/40 pb-3">
        <div className="flex items-center gap-2">
          <Icon name="film" className="text-primary text-xl" />
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Previz Animatic Player</h3>
            <p className="text-xs text-muted-foreground">
              Real-time camera motion pre-visualization & scratch dialogue sync
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onUpdateShots && (
            <button
              type="button"
              onClick={handleSnapToBeat}
              className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
              title={`Snap shots to ${bpm} BPM musical bars`}
            >
              <Icon name="music" className="text-xs" />
              Snap Cuts to Beat ({bpm} BPM)
            </button>
          )}
          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-muted text-foreground">
            {formatTimecode(currentTime)} / {formatTimecode(totalDuration)}
          </span>
        </div>
      </div>

      {/* Screen Viewport with Animatic Motion */}
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black/90 flex items-center justify-center shadow-inner">
        {activeImage ? (
          <img
            src={activeImage}
            alt="Animatic Frame"
            style={{
              transform: motionStyle.transform,
              opacity: motionStyle.opacity,
              transition: 'transform 0.1s linear',
            }}
            className="h-full w-full object-cover select-none"
          />
        ) : (
          <div
            style={{ transform: motionStyle.transform }}
            className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground space-y-2 select-none"
          >
            <Icon name="image" className="text-4xl text-muted-foreground/60" />
            <p className="text-sm font-medium text-foreground/90 max-w-md">
              {activeShotInfo.shot?.action || 'No action specified for this shot'}
            </p>
            <span className="text-xs text-primary font-mono">
              Shot {activeShotInfo.index + 1} of {shots.length} (
              {(activeShotInfo.shot?.duration || 4).toFixed(1)}s)
            </span>
          </div>
        )}

        {/* Live Shot Overlay */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span className="rounded bg-black/70 backdrop-blur-xs px-2 py-0.5 text-[11px] font-mono font-medium text-white shadow-xs">
            SHOT #{activeShotInfo.index + 1}
          </span>
          <span className="rounded bg-primary/80 backdrop-blur-xs px-2 py-0.5 text-[11px] font-medium text-white shadow-xs uppercase tracking-wide">
            {activeShotInfo.shot?.camera || 'Push-in'}
          </span>
        </div>

        {/* Dialogue Subtitle Strip */}
        {(activeShotInfo.shot?.dialogue || activeShotInfo.shot?.dialogueText) && (
          <div className="absolute bottom-3 inset-x-6 text-center">
            <span className="inline-block rounded-md bg-black/80 backdrop-blur-xs px-3 py-1.5 text-xs text-white shadow-md font-medium max-w-xl">
              &ldquo;{activeShotInfo.shot.dialogue || activeShotInfo.shot.dialogueText}&rdquo;
            </span>
          </div>
        )}
      </div>

      {/* Scrubber Bar */}
      <div className="space-y-1">
        <input
          type="range"
          min={0}
          max={totalDuration || 1}
          step={0.05}
          value={currentTime}
          onChange={(e) => {
            setCurrentTime(parseFloat(e.target.value));
            spokenShotIdRef.current = null;
          }}
          className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
        />
        <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
          <span>00:00:00</span>
          <span>{shots.length} Shots Planned</span>
          <span>{formatTimecode(totalDuration)}</span>
        </div>
      </div>

      {/* Transport & Setting Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setCurrentTime(0);
              spokenShotIdRef.current = null;
            }}
            className="p-1.5 rounded-lg border border-border/60 hover:bg-muted text-foreground transition-colors"
            title="Reset to beginning"
          >
            <Icon name="undo" className="text-sm" />
          </button>
          <button
            type="button"
            onClick={handleTogglePlay}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-medium text-xs hover:bg-primary/90 transition-colors shadow-xs"
          >
            <Icon name={isPlaying ? 'pause' : 'play'} className="text-sm" />
            {isPlaying ? 'Pause' : 'Play Previz'}
          </button>
          <select
            value={playbackRate}
            onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
            className="rounded-md border border-border/60 bg-background px-2 py-1 text-xs text-foreground"
          >
            <option value={0.5}>0.5x</option>
            <option value={1}>1.0x</option>
            <option value={1.5}>1.5x</option>
            <option value={2}>2.0x</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={ttsEnabled}
              onChange={(e) => setTtsEnabled(e.target.checked)}
              className="rounded border-border/80 text-primary focus:ring-primary h-3.5 w-3.5"
            />
            <span>TTS Scratch Audio</span>
          </label>
        </div>
      </div>
    </div>
  );
};
