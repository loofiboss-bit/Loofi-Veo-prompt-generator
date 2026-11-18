import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { TimelineClip, Asset } from '@core/types';
import AppDialog from '@shared/components/ui/AppDialog';
import Icon from '@shared/components/ui/Icon';
import {
  creatorSilenceService,
  type SilenceCutProposal,
} from '@core/services/creatorSilenceService';

interface SilenceCutModalProps {
  isOpen: boolean;
  onClose: () => void;
  clip: TimelineClip;
  asset?: Asset;
  allClips: TimelineClip[];
  onApplyCuts: (newClips: TimelineClip[]) => void;
}

export const SilenceCutModal: React.FC<SilenceCutModalProps> = ({
  isOpen,
  onClose,
  clip,
  asset,
  allClips,
  onApplyCuts,
}) => {
  const { t } = useTranslation('creator');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [noiseThreshold, setNoiseThreshold] = useState(-35);
  const [minDuration, setMinDuration] = useState(0.5);
  const [proposals, setProposals] = useState<SilenceCutProposal[]>([]);

  const mediaKey =
    asset?.storageKey ??
    asset?.id ??
    (typeof clip.resourceId === 'string' ? clip.resourceId : undefined);

  const runDetection = async () => {
    if (!mediaKey) {
      setError(t('silence.noMedia', 'No local media file associated with this clip.'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const silences = await creatorSilenceService.detectSilence(mediaKey, {
        noiseThresholdDb: noiseThreshold,
        minDurationSeconds: minDuration,
      });
      const generated = creatorSilenceService.buildProposals(clip, silences);
      setProposals(generated);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      void runDetection();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, clip.id]);

  const toggleProposal = (index: number) => {
    setProposals((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, selected: !item.selected } : item)),
    );
  };

  const handleApply = () => {
    const selected = proposals.filter((p) => p.selected);
    if (selected.length === 0) {
      onClose();
      return;
    }
    const updated = creatorSilenceService.applyCuts(allClips, clip.id, selected);
    onApplyCuts(updated);
    onClose();
  };

  const totalSilenceSeconds = proposals
    .filter((p) => p.selected)
    .reduce((sum, p) => sum + (p.clipTimelineEnd - p.clipTimelineStart), 0);

  return (
    <AppDialog isOpen={isOpen} onClose={onClose} showCloseButton={false} size="base">
      <div className="p-6 space-y-5 text-slate-200">
        <header className="flex items-center justify-between pb-3 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Icon name="mic" className="w-5 h-5 text-sky-400" />
            <div>
              <h2 className="text-lg font-semibold text-white">
                {t('silence.modalHeader', 'Trim Silent Pauses')}
              </h2>
              <p className="text-xs text-slate-400">
                {t(
                  'silence.description',
                  'Detect and remove silent pauses in this clip to tighten dialogue and pacing.',
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label={t('common.close', 'Close')}
          >
            <Icon name="cancel" className="w-5 h-5" />
          </button>
        </header>

        {error && (
          <div className="rounded-lg bg-rose-950/50 border border-rose-800 p-3 text-sm text-rose-300">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 rounded-lg bg-slate-800/40 p-4 border border-slate-700/60">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              {t('silence.noiseThreshold', 'Noise threshold')}: {noiseThreshold} dB
            </label>
            <input
              type="range"
              min="-60"
              max="-15"
              step="1"
              value={noiseThreshold}
              onChange={(e) => setNoiseThreshold(Number(e.target.value))}
              className="w-full"
            />
            <span className="text-[10px] text-slate-500">
              {t('silence.noiseHint', 'Quieter is to the left (-60 dB)')}
            </span>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              {t('silence.minDuration', 'Min duration')}: {minDuration.toFixed(1)}s
            </label>
            <input
              type="range"
              min="0.2"
              max="2.0"
              step="0.1"
              value={minDuration}
              onChange={(e) => setMinDuration(Number(e.target.value))}
              className="w-full"
            />
            <span className="text-[10px] text-slate-500">
              {t('silence.durationHint', 'Ignore shorter pauses')}
            </span>
          </div>
          <div className="col-span-2 flex justify-end">
            <button
              onClick={() => void runDetection()}
              disabled={loading}
              className="rounded bg-slate-700 hover:bg-slate-600 px-3 py-1.5 text-xs font-medium text-white transition-colors"
            >
              {loading
                ? t('silence.analyzing', 'Analyzing...')
                : t('silence.reanalyze', 'Re-analyze')}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>
              {t('silence.detected', 'Detected pauses')}: {proposals.length}
            </span>
            {totalSilenceSeconds > 0 && (
              <span className="text-sky-400 font-medium">
                {t('silence.totalRemoved', 'Total to remove')}: {totalSilenceSeconds.toFixed(1)}s
              </span>
            )}
          </div>

          {loading ? (
            <div className="py-8 text-center text-sm text-slate-400">
              {t('silence.analyzingAudio', 'Scanning audio for silent pauses...')}
            </div>
          ) : proposals.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400 border border-dashed border-slate-700 rounded-lg">
              {t('silence.noPausesFound', 'No silent pauses found matching the current settings.')}
            </div>
          ) : (
            <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
              {proposals.map((item, idx) => {
                const pauseDur = item.clipTimelineEnd - item.clipTimelineStart;
                return (
                  <label
                    key={idx}
                    className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors cursor-pointer ${
                      item.selected
                        ? 'bg-sky-950/30 border-sky-800/60 text-white'
                        : 'bg-slate-800/20 border-slate-700/40 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => toggleProposal(idx)}
                        className="rounded border-slate-700 bg-slate-800 text-sky-500 focus:ring-sky-500"
                      />
                      <span className="text-xs font-mono">
                        {item.clipTimelineStart.toFixed(2)}s – {item.clipTimelineEnd.toFixed(2)}s
                      </span>
                    </div>
                    <span className="text-xs font-medium text-sky-400">
                      -{pauseDur.toFixed(2)}s
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-end gap-3 pt-4 border-t border-slate-700">
          <button
            onClick={onClose}
            className="rounded border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            onClick={handleApply}
            disabled={loading || proposals.filter((p) => p.selected).length === 0}
            className="rounded bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50 transition-colors"
          >
            {t('silence.applyCuts', 'Apply cuts')}
          </button>
        </footer>
      </div>
    </AppDialog>
  );
};
