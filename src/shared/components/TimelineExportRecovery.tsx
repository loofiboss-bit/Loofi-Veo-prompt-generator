import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@core/store/useAppStore';
import type { MissingTimelineMedia } from '@core/services/projectTransferService';
import { openAssetLibrary } from '@shared/utils/assetLibraryEvents';

interface TimelineExportRecoveryProps {
  missingMedia: MissingTimelineMedia[];
  onRelink: (entry: MissingTimelineMedia, assetId: string) => void | Promise<void>;
}

export function TimelineExportRecovery({ missingMedia, onRelink }: TimelineExportRecoveryProps) {
  const { t } = useTranslation('create');
  const assets = useAppStore((state) => state.assets);
  const clips = useAppStore((state) => state.clips);
  const [replacementIds, setReplacementIds] = useState<Record<string, string>>({});
  if (!missingMedia.length) return null;
  return (
    <div role="alert" className="mt-3 space-y-3 rounded-lg border border-amber-700 p-3 text-sm">
      <p>
        {t(
          'labels.missingExportMedia',
          'Selected timeline media is missing. Relink the listed clips before exporting.',
        )}
      </p>
      <button type="button" onClick={openAssetLibrary} className="underline">
        {t('actions.openMediaLibrary', 'Open media library')}
      </button>
      <ul className="space-y-3">
        {missingMedia.map((entry) => {
          const key = entry.clipId ?? entry.mediaKey;
          const replacementId = replacementIds[key] ?? '';
          const mediaType = clips.find((clip) => clip.id === entry.clipId)?.type ?? 'video';
          return (
            <li key={key} className="flex flex-wrap items-center gap-2">
              <span>
                {entry.clipLabel} ({entry.mediaKey})
              </span>
              <select
                aria-label={`${t('labels.chooseReplacementMedia', 'Choose replacement media')}: ${entry.clipLabel}`}
                value={replacementId}
                onChange={(event) =>
                  setReplacementIds((current) => ({ ...current, [key]: event.target.value }))
                }
                className="rounded border border-slate-600 bg-slate-950 p-2 text-slate-100"
              >
                <option value="">
                  {t('labels.chooseReplacementMedia', 'Choose replacement media')}
                </option>
                {assets
                  .filter((asset) => asset.type === mediaType)
                  .map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.name}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                disabled={!replacementId}
                onClick={() => void onRelink(entry, replacementId)}
                className="rounded border border-slate-600 px-3 py-2 disabled:opacity-50"
              >
                {t('actions.relinkExportMedia', 'Relink clip')}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
