import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Shot } from '@core/types';
import type { AudioEventCue, AudioPipelineConfig } from '@core/types/audioPipeline';
import { useAppStore } from '@core/store/useAppStore';
import {
  detectSequenceAudioCues,
  executeBatchPipeline,
  DEFAULT_AUDIO_PIPELINE_CONFIG,
} from '@core/services/audioFoleyPipelineService';
import Icon from '@shared/components/ui/Icon';

export interface AudioPipelinePanelProps {
  isOpen: boolean;
  onClose: () => void;
  shots: Shot[];
}

export const AudioPipelinePanel: React.FC<AudioPipelinePanelProps> = ({
  isOpen,
  onClose,
  shots,
}) => {
  const { clips, removeTimelineClip } = useAppStore();

  const [config, setConfig] = useState<AudioPipelineConfig>(DEFAULT_AUDIO_PIPELINE_CONFIG);
  const [cues, setCues] = useState<AudioEventCue[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [filterCategory, setFilterCategory] = useState<
    'all' | 'dialogue' | 'foley' | 'sfx' | 'ambience'
  >('all');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleScanCues = useCallback(() => {
    setIsDetecting(true);
    setSuccessMessage(null);
    try {
      const detection = detectSequenceAudioCues(shots, config);
      setCues(detection.cues);
    } finally {
      setIsDetecting(false);
    }
  }, [shots, config]);

  // Auto-scan cues when opened
  useEffect(() => {
    if (isOpen && shots.length > 0 && cues.length === 0) {
      handleScanCues();
    }
  }, [isOpen, shots.length, cues.length, handleScanCues]);

  const handleExecutePipeline = async () => {
    if (shots.length === 0) return;
    setIsProcessing(true);
    setProgress({ completed: 0, total: cues.length });
    setSuccessMessage(null);

    try {
      const result = await executeBatchPipeline(shots, config, (completed, total) => {
        setProgress({ completed, total });
      });

      setCues(result.cues);
      setSuccessMessage(
        `Genererade och placerade ${result.clips.length} ljudklipp över spår A2, A3 och A5!`,
      );
    } catch {
      // Error handled by service
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearAudioTracks = () => {
    const audioTrackIds = new Set(['audio_dialogue', 'audio_sfx', 'audio_ambience']);
    const clipsToRemove = clips.filter((c) => audioTrackIds.has(c.trackId));
    for (const clip of clipsToRemove) {
      removeTimelineClip(clip.id);
    }
    setCues((prev) => prev.map((c) => ({ ...c, status: 'pending' })));
    setSuccessMessage(`Rensade ${clipsToRemove.length} ljudklipp från tidslinjen.`);
  };

  const handleUpdateCuePrompt = (cueId: string, newPrompt: string) => {
    setCues((prev) =>
      prev.map((c) =>
        c.id === cueId ? { ...c, prompt: newPrompt, label: newPrompt.slice(0, 30) } : c,
      ),
    );
  };

  const filteredCues = useMemo(() => {
    if (filterCategory === 'all') return cues;
    return cues.filter((c) => c.category === filterCategory);
  }, [cues, filterCategory]);

  const cueCounts = useMemo(() => {
    return {
      all: cues.length,
      dialogue: cues.filter((c) => c.category === 'dialogue').length,
      foley: cues.filter((c) => c.category === 'foley').length,
      sfx: cues.filter((c) => c.category === 'sfx').length,
      ambience: cues.filter((c) => c.category === 'ambience').length,
    };
  }, [cues]);

  if (!isOpen) return null;

  return (
    <aside
      aria-label="Foley and SFX Audio Pipeline"
      className="absolute top-0 right-0 z-40 h-full w-96 border-l border-slate-800 bg-slate-950/95 text-slate-100 shadow-2xl backdrop-blur-xl flex flex-col animate-in slide-in-from-right duration-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 bg-slate-900/60">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400">
            <Icon name="audio" className="text-base" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Foley & SFX Pipeline
              <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-mono text-cyan-300">
                v13.0
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">Multi-track ljudläggning & ducking</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Stäng panel"
          className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          <Icon name="close" className="text-sm" />
        </button>
      </div>

      {/* Settings & Configuration */}
      <div className="border-b border-slate-800/80 bg-slate-900/30 p-3 space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={config.autoDuckMusic}
              onChange={(e) => setConfig({ ...config, autoDuckMusic: e.target.checked })}
              className="rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-0"
            />
            <span>Auto-ducking musik & atmosfär</span>
          </label>
          <span className="text-[10px] font-mono text-cyan-400">{config.duckDepthDb} dB</span>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={config.autoGenerateAmbience}
              onChange={(e) => setConfig({ ...config, autoGenerateAmbience: e.target.checked })}
              className="rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-0"
            />
            <span>Generera rumston (A5 Ambience)</span>
          </label>
          <select
            value={config.ttsVoice}
            onChange={(e) => setConfig({ ...config, ttsVoice: e.target.value })}
            className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] text-slate-200"
          >
            <option value="Kore">Röst: Kore</option>
            <option value="Puck">Röst: Puck</option>
            <option value="Fenrir">Röst: Fenrir</option>
            <option value="Aoede">Röst: Aoede</option>
          </select>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-3 border-b border-slate-800/60 bg-slate-900/40 flex items-center gap-2">
        <button
          type="button"
          onClick={handleScanCues}
          disabled={isDetecting || isProcessing}
          className="flex-1 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition flex items-center justify-center gap-1.5"
        >
          <Icon name="sparkles" className="text-xs" />
          {isDetecting ? 'Skannar...' : 'Skanna tagningar'}
        </button>

        <button
          type="button"
          onClick={handleExecutePipeline}
          disabled={isProcessing || cues.length === 0}
          className="flex-1 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-lg shadow-cyan-900/30 hover:from-cyan-500 hover:to-blue-500 transition disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          <Icon name="play" className="text-xs" />
          {isProcessing
            ? `${progress.completed}/${progress.total}...`
            : `Syntetisera & Placera (${cues.length})`}
        </button>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="mx-3 mt-2 rounded-lg bg-emerald-950/60 border border-emerald-700/60 p-2 text-xs text-emerald-300 flex items-center justify-between">
          <span>{successMessage}</span>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-400 hover:text-white"
          >
            <Icon name="close" className="text-xs" />
          </button>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex border-b border-slate-800 px-3 pt-2 gap-1 overflow-x-auto text-[11px]">
        {(['all', 'dialogue', 'foley', 'sfx', 'ambience'] as const).map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setFilterCategory(cat)}
            className={`px-2 py-1.5 border-b-2 font-medium capitalize transition-colors ${
              filterCategory === cat
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {cat} ({cueCounts[cat]})
          </button>
        ))}
      </div>

      {/* Cues List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {filteredCues.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs">
            Inga detekterade ljudpunkter. Klicka på &quot;Skanna tagningar&quot; för att analysera
            tidslinjen.
          </div>
        ) : (
          filteredCues.map((cue) => {
            const trackColor =
              cue.targetTrackId === 'audio_dialogue'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                : cue.category === 'ambience'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/30';

            return (
              <div
                key={cue.id}
                className="rounded-xl border border-slate-800 bg-slate-900/60 p-2.5 space-y-2 hover:border-slate-700 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[9px] font-mono border font-semibold ${trackColor}`}
                    >
                      {cue.targetTrackId.toUpperCase().replace('AUDIO_', 'A-')}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      t={cue.timeOffsetSeconds.toFixed(1)}s ({cue.durationSeconds.toFixed(1)}s)
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-medium ${
                      cue.status === 'ready'
                        ? 'text-emerald-400'
                        : cue.status === 'synthesizing'
                          ? 'text-amber-400 animate-pulse'
                          : 'text-slate-500'
                    }`}
                  >
                    {cue.status === 'ready'
                      ? 'Placerad'
                      : cue.status === 'synthesizing'
                        ? 'Syntetiserar...'
                        : 'Väntar'}
                  </span>
                </div>

                <div className="text-[11px] font-semibold text-slate-200 truncate">{cue.label}</div>

                <input
                  type="text"
                  value={cue.prompt}
                  onChange={(e) => handleUpdateCuePrompt(cue.id, e.target.value)}
                  className="w-full rounded border border-slate-800 bg-slate-950 px-2 py-1 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                  placeholder="Ljudbeskrivning eller replik..."
                />

                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>Volym: {Math.round(cue.volume * 100)}%</span>
                  {cue.duckingIntensity && cue.duckingIntensity > 0 ? (
                    <span className="text-cyan-400">
                      Ducking: {Math.round(cue.duckingIntensity * 100)}%
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Actions */}
      <div className="border-t border-slate-800 p-3 bg-slate-900/60 flex items-center justify-between text-xs">
        <button
          type="button"
          onClick={handleClearAudioTracks}
          className="text-red-400/80 hover:text-red-300 flex items-center gap-1 transition"
        >
          <Icon name="trash" className="text-xs" />
          Rensa ljudspår
        </button>

        <span className="text-[10px] text-slate-500 font-mono">
          {shots.length} {shots.length === 1 ? 'tagning' : 'tagningar'}
        </span>
      </div>
    </aside>
  );
};

export default AudioPipelinePanel;
