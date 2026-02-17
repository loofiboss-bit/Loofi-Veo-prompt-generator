import React, { useState } from 'react';
import Icon from '@shared/components/ui/Icon';
import CheckboxInput from './ui/CheckboxInput';
import { useAppStore } from '@core/store/useAppStore';
import { decode, decodeAudioData } from '@core/utils/audio';
import { calculateDuckingEnvelope } from '@core/services/audioAnalysisService';
import { logger } from '@core/services/loggerService';

interface AudioMixerProps {
  volumes: { dialogue: number; sfx: number; music: number; ambience?: number };
  autoDuck: boolean;
  onChange: (key: 'dialogue' | 'sfx' | 'music' | 'ambience', value: number) => void;
  onAutoDuckChange: (checked: boolean) => void;
  onReset: () => void;
}

const VerticalSlider: React.FC<{
  label: string;
  icon: React.ComponentProps<typeof Icon>['name'];
  value: number;
  onChange: (val: number) => void;
  colorClass: string;
}> = ({ label, icon, value, onChange, colorClass }) => (
  <div className="flex flex-col items-center h-48 group">
    <div className="text-[10px] uppercase font-bold text-slate-400 mb-2">
      {Math.round(value * 100)}%
    </div>
    <div className="relative flex-grow w-8 bg-slate-900 rounded-full border border-slate-700 overflow-hidden">
      <div
        className={`absolute bottom-0 left-0 right-0 transition-all duration-100 ${colorClass}`}
        style={{ height: `${Math.min(100, (value / 1.5) * 100)}%` }}
      />
      <input
        type="range"
        min="0"
        max="1.5"
        step="0.1"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        title={`${label}: ${Math.round(value * 100)}%`}
      />
    </div>
    <div className="mt-3 flex flex-col items-center gap-1">
      <Icon name={icon} className="w-4 h-4 text-slate-300" />
      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
        {label}
      </span>
    </div>
  </div>
);

const AudioMixer: React.FC<AudioMixerProps> = ({
  volumes,
  autoDuck,
  onChange,
  onAutoDuckChange,
  onReset,
}) => {
  // Access flattened tracks/clips from store
  const { tracks, clips, assets, updateTimelineClip } = useAppStore();
  const [isDucking, setIsDucking] = useState(false);

  const handleAutoDuckProcess = async () => {
    setIsDucking(true);
    try {
      // 1. Identify Tracks & Clips
      const dialogueTracks = tracks.filter((t) => t.trackType === 'dialogue').map((t) => t.id);
      const musicTracks = tracks.filter((t) => t.trackType === 'music').map((t) => t.id);

      const dialogueClips = clips.filter((c) => dialogueTracks.includes(c.trackId));
      const musicClips = clips.filter((c) => musicTracks.includes(c.trackId));

      if (dialogueClips.length === 0 || musicClips.length === 0) {
        alert('Need both dialogue and music clips on the timeline to auto-duck.');
        setIsDucking(false);
        return;
      }

      // 2. Prepare Audio Context
      const ctx = new (
        window.AudioContext ||
        (window as unknown as Record<string, typeof AudioContext>).webkitAudioContext
      )();
      const timelineDuration = Math.max(...clips.map((c) => c.startTime + c.duration)) || 30;

      // 3. Render Dialogue Timeline to a Single Buffer (Simplifies analysis)
      // We use OfflineAudioContext to mix all speech into one track for analysis
      const offlineCtx = new OfflineAudioContext(1, timelineDuration * 44100, 44100);

      for (const clip of dialogueClips) {
        const asset = assets.find((a) => a.id === String(clip.resourceId));
        if (asset && asset.data) {
          const audioBuffer = await decodeAudioData(decode(asset.data), ctx, 44100, 1);
          const source = offlineCtx.createBufferSource();
          source.buffer = audioBuffer;
          source.start(clip.startTime, clip.offset, clip.duration);
          source.connect(offlineCtx.destination);
        }
      }

      const masterDialogueBuffer = await offlineCtx.startRendering();

      // 4. Calculate Ducking Envelope
      const keyframes = calculateDuckingEnvelope(masterDialogueBuffer, masterDialogueBuffer);

      // 5. Apply Keyframes to Music Clips
      let appliedCount = 0;
      for (const mClip of musicClips) {
        const clipStart = mClip.startTime;
        const clipEnd = mClip.startTime + mClip.duration;

        const clipKeyframes = keyframes
          .filter((k) => k.time >= clipStart && k.time <= clipEnd)
          .map((k) => ({
            time: k.time - clipStart, // Make relative to clip start
            value: k.value,
          }));

        if (clipKeyframes.length > 0) {
          if (clipKeyframes[0].time > 0) {
            clipKeyframes.unshift({ time: 0, value: 1 });
          }
          if (clipKeyframes[clipKeyframes.length - 1].time < mClip.duration) {
            clipKeyframes.push({ time: mClip.duration, value: 1 });
          }

          updateTimelineClip(mClip.id, { volumeKeyframes: clipKeyframes });
          appliedCount++;
        }
      }

      alert(`Applied auto-ducking to ${appliedCount} music clips.`);
    } catch (e) {
      logger.error('Auto-Duck failed', e);
      alert('Failed to process auto-ducking.');
    } finally {
      setIsDucking(false);
    }
  };

  return (
    <div className="bg-slate-800/90 backdrop-blur-xl p-5 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-md">
      <div className="flex justify-between items-center mb-5 border-b border-slate-700/50 pb-3">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Icon name="sliders" className="w-4 h-4 text-cyan-400" />
          Audio Mixer
        </h3>
        <button
          onClick={onReset}
          className="text-[10px] text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-700 px-2 py-1 rounded transition-colors"
        >
          Reset
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <VerticalSlider
          label="Dialogue"
          icon="user"
          value={volumes.dialogue}
          onChange={(v) => onChange('dialogue', v)}
          colorClass="bg-cyan-500/80"
        />
        <VerticalSlider
          label="Ambience"
          icon="activity"
          value={volumes.ambience || 0.15}
          onChange={(v) => onChange('ambience', v)}
          colorClass="bg-purple-500/80"
        />
        <VerticalSlider
          label="SFX"
          icon="filter"
          value={volumes.sfx}
          onChange={(v) => onChange('sfx', v)}
          colorClass="bg-yellow-500/80"
        />
        <VerticalSlider
          label="Music"
          icon="music"
          value={volumes.music}
          onChange={(v) => onChange('music', v)}
          colorClass="bg-fuchsia-500/80"
        />
      </div>

      <div className="pt-3 border-t border-slate-700/50 space-y-3">
        <CheckboxInput
          id="autoDuck"
          name="autoDuck"
          label="Live Sidechain (Simple)"
          checked={autoDuck}
          onChange={(e) => onAutoDuckChange(e.target.checked)}
          tooltipText="Automatically lower music volume during playback (Real-time)."
        />

        <button
          onClick={handleAutoDuckProcess}
          disabled={isDucking}
          className="w-full py-2 bg-yellow-600 hover:bg-yellow-500 text-slate-900 font-bold rounded-lg text-xs flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
        >
          {isDucking ? <Icon name="spinner" className="w-3.5 h-3.5 animate-spin" /> : '🦆'}
          {isDucking ? 'Analyzing Audio...' : 'Auto-Duck Music (Write Keyframes)'}
        </button>
      </div>
    </div>
  );
};

export default AudioMixer;
